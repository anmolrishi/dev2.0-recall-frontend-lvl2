const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const pLimit = require("p-limit"); // For concurrency control

const supabaseUrl = "https://epklqvqohpibcgbilrxd.supabase.co";
const supabaseAnonKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwa2xxdnFvaHBpYmNnYmlscnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg2OTY4NDQsImV4cCI6MjA0NDI3Mjg0NH0.qyBBF8ep2PZg59VfTHi-zQy8XavWyAqIYxjJ_a5l8wA`;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper function to fetch contacts associated with a campaign
const getContacts = async (campaignId) => {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("campaignId", campaignId);

    if (error) {
      console.error("Error fetching contacts:", error.message);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error in getContacts function:", error.message);
    throw error;
  }
};

// Helper function to get user's Retell API key
const getUserRetellApiKey = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("user_dialing_credits")
      .select("retell_api_key")
      .eq("userId", userId)
      .single();

    if (error) throw error;
    return data?.retell_api_key;
  } catch (error) {
    console.error("Error fetching Retell API key:", error.message);
    throw error;
  }
};

// Helper function to get concurrency status from Retell AI API
const getConcurrencyStatus = async (retellApiKey) => {
  try {
    const response = await axios.get(
      "https://api.retellai.com/get-concurrency",
      {
        headers: {
          Authorization: `Bearer ${retellApiKey}`,
        },
        timeout: 10000, // Set a timeout for the request
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching concurrency status:", error.message);
    return null;
  }
};

// Helper function to create a phone call using Retell AI API
const createPhoneCall = async (
  fromNumber,
  toNumber,
  agentId,
  firstName,
  retellApiKey,
  retries = 0,
) => {
  const data = {
    from_number: fromNumber,
    to_number: "+" + toNumber,
    override_agent_id: agentId,
    retell_llm_dynamic_variables: {
      first_name: firstName,
    },
  };

  try {
    const response = await axios.post(
      "https://api.retellai.com/v2/create-phone-call",
      data,
      {
        headers: {
          Authorization: `Bearer ${retellApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // Set a timeout for the request
      },
    );
    return response.data;
  } catch (error) {
    if (retries < 3) {
      // Exponential backoff
      const delay = Math.pow(2, retries) * 1000;
      console.warn(
        `Retrying createPhoneCall for ${firstName} in ${delay / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return createPhoneCall(
        fromNumber,
        toNumber,
        agentId,
        firstName,
        retellApiKey,
        retries + 1,
      );
    } else {
      console.error(
        `Error creating phone call for ${firstName}:`,
        error.message,
      );
      return null;
    }
  }
};

// Supabase helper function to update a campaign
const updateCampaign = async (id, updates) => {
  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating campaign:", error.message);
    throw error;
  }
  return data;
};

// Supabase helper function to update a contact
const updateContact = async (id, updates) => {
  const { error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating contact:", error.message);
    throw error;
  }
};

// Supabase helper function to add a call log
const addCallLog = async (callLog) => {
  const { error } = await supabase.from("call_logs").insert([callLog]);

  if (error) {
    console.error("Error adding call log:", error.message);
    throw error;
  }
};

//Endpoint to listen to payment updates
app.post("/status_lemon_squeezy_payment", async (req, res) => {
  console.log("Payment received: ", req.body.data);

  const paymentData = req.body.data;
  const userId = req.body.meta.custom_data.user_id;

  console.log("Payment received from user with id: ", userId);
  if (paymentData.attributes.status === "paid") {
    const amountPaid = paymentData.attributes.subtotal_usd / 100; // Convert cents to USD
    let creditsToAdd = 0;

    // Determine the number of credits to add based on the payment amount
    if (amountPaid === 25) {
      creditsToAdd = 5000;
    } else if (amountPaid === 100) {
      creditsToAdd = 25000;
    } else if (amountPaid === 500) {
      creditsToAdd = 150000;
    } else {
      console.error(`Unexpected payment amount: ${amountPaid} USD.`);
      return res.status(400).json({ error: "Invalid payment amount." });
    }

    try {
      console.log(`Adding ${creditsToAdd} credits to user ${userId}.`);

      // Call the RPC to increment the user's dialing credits
      const { data, error } = await supabase.rpc("increment_dialing_credits", {
        user_id: userId,
        credit_amount: creditsToAdd,
      });

      if (error) {
        console.error("Error updating user credits via RPC:", error.message);
        return res
          .status(500)
          .json({ error: "Failed to update user credits." });
      }

      console.log(`User ${userId} now has additional ${creditsToAdd} credits.`);
      res.status(200).send("Payment successful and credits updated.");
    } catch (error) {
      console.error("Error processing payment:", error.message);
      res.status(500).json({ error: "Internal server error." });
    }
  } else {
    console.log("Payment failed or incomplete.");
    res.status(200).send("Payment not successful.");
  }
});

// Endpoint to update campaign status
app.post("/api/update-campaign-status", async (req, res) => {
  const { campaignId, status } = req.body;

  if (!campaignId || !status) {
    return res.status(400).json({ error: "Invalid campaign ID or status" });
  }

  try {
    const { data, error } = await supabase
      .from("campaigns")
      .update({ status })
      .eq("id", campaignId);

    if (error) {
      console.error("Error updating campaign status:", error.message);
      return res.status(500).json({ error: "Error updating campaign status" });
    }

    res.json({ success: true, message: "Campaign status updated", data });
  } catch (error) {
    console.error("Error updating campaign status:", error.message);
    res.status(500).json({ error: "Error updating campaign status" });
  }
});

app.post("/api/start-bulk-dialing", async (req, res) => {
  const { campaignId, userId } = req.body;

  console.log("Request received for campaign ID:", campaignId);

  if (!campaignId || !userId) {
    console.error("Invalid campaign ID or user ID");
    return res.status(400).json({ error: "Invalid campaign ID or user ID" });
  }

  try {
    // Fetch campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError?.message);
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Get user's Retell API key
    const retellApiKey = await getUserRetellApiKey(userId);
    if (!retellApiKey) {
      return res.status(400).json({ error: "Retell API key not found for user" });
    }

    if (campaign.hasRun) {
      console.error("Campaign has already been run:", campaign.id);
      return res.status(400).json({
        error: "This campaign has already been run and cannot be run again.",
      });
    }

    // Fetch contacts
    const contacts = await getContacts(campaignId);

    // Filter contacts without callId
    const contactsToCall = contacts.filter((contact) => !contact.callId);

    if (!contactsToCall.length) {
      console.error("No contacts to call for campaign:", campaignId);
      return res
        .status(400)
        .json({ error: "No contacts to call for this campaign" });
    }

    // Check user's dialing credits
    const { data: userData, error: userError } = await supabase
      .from("user_dialing_credits")
      .select("dialing_credits")
      .eq("userId", userId)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError.message);
      return res.status(500).json({ error: "Error fetching user data" });
    }

    let userCredits = userData.dialing_credits;
    if (userCredits < contactsToCall.length) {
      const purchaseLink = `https://darwizpayment.edsplore.com/buy/628a4a2e-44f5-42f5-9565-489d58f52de4?checkout[custom][user_id]=${userId}`;
      return res.status(402).json({
        error: "Insufficient dialing credits",
        purchaseLink: purchaseLink,
      });
    }

    let calledCount = 0;
    const totalContacts = contactsToCall.length;

    console.log(
      `Updating campaign ${campaign.id} status to 'In Progress' and setting hasRun to true`,
    );
    await updateCampaign(campaign.id, { status: "In Progress", hasRun: true });

    let contactQueue = [...contactsToCall]; // Clone the contactsToCall array
    const limit = pLimit(25); // Adjust the concurrency limit as needed

    // Start bulk dialing in background
    (async () => {
      while (contactQueue.length > 0) {
        // Fetch the latest campaign status
        const { data: updatedCampaign, error: campaignError } = await supabase
          .from("campaigns")
          .select("status")
          .eq("id", campaignId)
          .single();

        if (campaignError) {
          console.error(
            "Error fetching campaign status:",
            campaignError.message,
          );
          break;
        }

        if (updatedCampaign.status === "Paused") {
          console.log("Campaign is paused. Waiting to resume...");
          // Wait until the campaign status changes from 'Paused'
          while (true) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            const { data: checkCampaign, error: checkError } = await supabase
              .from("campaigns")
              .select("status")
              .eq("id", campaignId)
              .single();

            if (checkError) {
              console.error(
                "Error fetching campaign status:",
                checkError.message,
              );
              break;
            }
            if (checkCampaign.status !== "Paused") {
              console.log("Campaign resumed. Continuing bulk dialing...");
              break;
            }
          }
        }

        // Check current concurrency
        console.log("Fetching current concurrency status");
        const concurrencyStatus = await getConcurrencyStatus(retellApiKey);

        if (!concurrencyStatus) {
          console.error(
            "Unable to fetch concurrency status. Skipping concurrency check...",
          );
        }

        let available_concurrency = 10; // Default value if concurrency status is unavailable

        if (concurrencyStatus) {
          const { current_concurrency, concurrency_limit } = concurrencyStatus;
          available_concurrency = concurrency_limit - current_concurrency;

          console.log(
            `Current concurrency: ${current_concurrency}, Concurrency limit: ${concurrency_limit}, Available concurrency: ${available_concurrency}`,
          );

          if (available_concurrency <= 0) {
            console.log("No available concurrency. Waiting for 5 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
          }
        } else {
          console.log(
            "Proceeding with default available concurrency due to inability to fetch status.",
          );
        }

        // Determine how many contacts we can process in this batch
        const batchSize = Math.min(available_concurrency, contactQueue.length);
        const batchContacts = contactQueue.splice(0, batchSize);

        console.log(`Processing batch of ${batchContacts.length} contacts`);

        // Initiate calls for batchContacts with concurrency limit
        const callPromises = batchContacts.map((contact) =>
          limit(async () => {
            try {
              // Fetch the latest credit count from the database
              const { data: latestUserData, error: latestUserError } =
                await supabase
                  .from("user_dialing_credits")
                  .select("dialing_credits")
                  .eq("userId", userId)
                  .single();

              if (latestUserError) {
                throw new Error(
                  `Error fetching latest user data: ${latestUserError.message}`,
                );
              }

              userCredits = latestUserData.dialing_credits;

              // Check if user has enough credits
              if (userCredits <= 0) {
                console.error("User ran out of credits during campaign");
                const purchaseLink = `https://darwizpayment.edsplore.com/buy/628a4a2e-44f5-42f5-9565-489d58f52de4?checkout[custom][user_id]=${userId}`;
                throw new Error(
                  `Insufficient credits. Purchase more at: ${purchaseLink}`,
                );
              }

              // Skip contacts that already have a callId
              if (contact.callId) {
                console.log(
                  `Contact ${contact.firstName} already has a callId. Skipping.`,
                );
                return;
              }

              console.log(
                `Attempting to create call for contact ${contact.firstName} (${contact.phoneNumber})`,
              );
              const callResponse = await createPhoneCall(
                campaign.outboundNumber,
                contact.phoneNumber,
                campaign.agentId,
                contact.firstName,
                retellApiKey,
              );

              if (callResponse) {
                console.log(
                  `Call created successfully for contact ${contact.firstName}, call ID: ${callResponse.call_id}`,
                );
                // Safely increment calledCount
                calledCount++;
                const newProgress = Math.round(
                  (calledCount / totalContacts) * 100,
                );
                console.log(`Updating campaign progress to ${newProgress}%`);

                // Decrement dialing credits
                userCredits--;
                console.log(`Updating dialing credits to ${userCredits}`);

                // Update credits in the database using a transaction
                const { data, error } = await supabase.rpc(
                  "decrement_dialing_credits",
                  {
                    user_id: userId,
                  },
                );

                if (error) {
                  throw new Error(
                    `Failed to update dialing credits: ${error.message}`,
                  );
                }

                // Ensure database updates are awaited
                await Promise.all([
                  updateCampaign(campaign.id, { progress: newProgress }),
                  updateContact(contact.id, {
                    callId: callResponse.call_id,
                  }),
                  addCallLog({
                    campaignId: campaign.id,
                    phoneNumber: contact.phoneNumber,
                    firstName: contact.firstName,
                    callId: callResponse.call_id,
                  }),
                ]);

                console.log(
                  `Contact ${contact.firstName} called successfully (${calledCount}/${totalContacts})`,
                );
              } else {
                console.error(`Failed to create call for ${contact.firstName}`);
              }
            } catch (error) {
              console.error(
                `Error processing contact ${contact.firstName}:`,
                error.message,
              );
              if (error.message.includes("Insufficient credits")) {
                throw error;
              }
            }
          }),
        );

        try {
          await Promise.allSettled(callPromises);
        } catch (error) {
          if (error.message.includes("Insufficient credits")) {
            console.error("Campaign stopped due to insufficient credits");
            await updateCampaign(campaign.id, {
              status: "Paused",
              progress: Math.round((calledCount / totalContacts) * 100),
            });
            break;
          }
        }

        console.log(
          "Batch processing complete. Waiting for 2 seconds before next batch...",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log(
        `All contacts processed. Updating campaign ${campaign.id} status to 'Completed' and progress to 100%`,
      );
      await updateCampaign(campaign.id, { status: "Completed", progress: 100 });
    })();

    res.json({ success: true, message: "Bulk dialing started successfully" });
  } catch (error) {
    console.error("Error during bulk dialing:", error.message);
    res.status(500).json({ error: "An error occurred during bulk dialing" });
  }
});

// Endpoint to analyze call logs
app.post("/api/analyze-call-logs", async (req, res) => {
  const { campaignId, userId } = req.body;

  if (!campaignId || !userId) {
    return res.status(400).json({ error: "Invalid campaign ID or user ID" });
  }

  try {
    // Get user's Retell API key
    const retellApiKey = await getUserRetellApiKey(userId);
    if (!retellApiKey) {
      return res.status(400).json({ error: "Retell API key not found for user" });
    }

    const { data: logs, error: logsError } = await supabase
      .from("call_logs")
      .select("*")
      .eq("campaignId", campaignId);

    if (logsError) throw logsError;

    // Limit concurrent analyses to prevent overloading the API
    const limit = pLimit(5);

    const analyzePromises = logs.map((log) =>
      limit(async () => {
        try {
          const response = await axios.get(
            `https://api.retellai.com/v2/get-call/${log.callId}`,
            {
              headers: {
                Authorization: `Bearer ${retellApiKey}`,
              },
              timeout: 10000,
            },
          );

          const callDuration =
            (response.data.end_timestamp - response.data.start_timestamp) /
            1000.0;

          const callDetails = {
            disconnection_reason: response.data.disconnection_reason || "",
            call_transcript: response.data.transcript || "",
            call_summary: response.data.call_analysis?.call_summary || "",
            call_recording: response.data.recording_url || "",
            start_time: new Date(response.data.start_timestamp).toISOString(),
            end_time: new Date(response.data.end_timestamp).toISOString(),
            call_duration: callDuration,
            user_sentiment: response.data.call_analysis?.user_sentiment,
            call_direction: response.data.direction,
          };

          console.log(`${log.callId} analyzed successfully`);

          const { error: updateError } = await supabase
            .from("call_logs")
            .update(callDetails)
            .eq("id", log.id);

          if (updateError) throw updateError;
        } catch (error) {
          console.error(`Error analyzing call ${log.callId}:`, error.message);
        }
      }),
    );

    await Promise.allSettled(analyzePromises);

    const { data: updatedLogs, error: updatedLogsError } = await supabase
      .from("call_logs")
      .select("*")
      .eq("campaignId", campaignId);

    if (updatedLogsError) throw updatedLogsError;

    res.json({ success: true, callLogs: updatedLogs });
  } catch (error) {
    console.error("Error during call log analysis:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred during call log analysis" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});