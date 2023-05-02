const core = require("@actions/core");
const axios = require("axios");
const axiosRetry = require("axios-retry");
const parseLinkHeader = require("parse-link-header");

async function run() {
    const accessToken = core.getInput("accessToken", { required: true });
    const organization = core.getInput("organization", { required: true });
    const inactiveDays = core.getInput("inactiveDays") || 30;

    axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

    const config = {
        headers: { Authorization: `Bearer ${accessToken}` },
    };

    const getPaginatedReleaseData = async (endpoint) => {
        let data = [];
        let nextPage = endpoint;

        while (true) {
            const response = await axios.get(nextPage, config);
            if (response.data) {
                data = [...data, ...response.data];
            }

            const paginationLinks = parseLinkHeader(response.headers?.link);
            if (paginationLinks.next?.results !== "true") {
                break;
            }

            nextPage = paginationLinks.next.url;
        }

        return data;
    };

    // Get releases
    let data = null;
    try {
        data = await getPaginatedReleaseData(
            `https://sentry.io/api/0/organizations/${organization}/releases/`
        );
        console.log("Found", data.length, "releases");
    } catch (error) {
        console.error("Failed with error", error);
        return;
    }

    // Delete qualified releases
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - inactiveDays);

    for (const release of data) {
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
            console.error("Failed with error", error);
            continue;
        }
    }
}

run();
