const core = require("@actions/core");
const axios = require("axios");
const axiosRetry = require("axios-retry");

async function run() {
    const accessToken = core.getInput("accessToken", { required: true });
    const organization = core.getInput("organization", { required: true });
    const inactiveDays = core.getInput("inactiveDays") || 30;

    axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

    const config = {
        headers: { Authorization: `Bearer ${accessToken}` },
    };

    // Get releases
    let response = null;
    try {
        response = await axios.get(
            `https://sentry.io/api/0/organizations/${organization}/releases/`,
            config
        );
        console.log(response);
    } catch (error) {
        console.error("Failed with error", error);
        return;
    }

    if (!response.data) {
        console.error("No release data", response.status);
        return;
    }

    // Delete qualified releases
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - inactiveDays);

    for (const release of response.data) {
        let lastEvent = null;
        try {
            lastEvent = Date.parse(release.lastEvent || release.dateCreated);
        } catch (error) {
            console.error("Failed to parse date for release", release.version);
            continue;
        }

        if (lastEvent >= fromDate) {
            continue;
        }

        try {
            const deletedResponse = await axios.delete(
                `https://sentry.io/api/0/organizations/${organization}/releases/${release.version}/`,
                config
            );

            if (deletedResponse.status === 204) {
                console.log("Successfully deleted release", release.version);
            } else {
                console.warn(
                    "Failed to delete release",
                    release.version,
                    deletedResponse.status
                );
            }
        } catch (error) {
            console.error("Failed with error:", error);
            continue;
        }
    }
}

run();
