
var submissionTimeout;

// Function to fill and submit the form
function fillAndSubmitForm(record, currentIndex) {
    document.querySelector('input[name="callloged_by"]').value = record.Logged_By_Name;
    document.querySelector('select[name="state"]').value = record.State_Name;
    document.querySelector('select[name="calltype"]').value = record.Call_Type;
    document.querySelector('select[name="bank"]').value = record.Bank_Name;
    document.querySelector('select[name="vendor"]').value = record.Vendor_Name;
    document.querySelector('select[name="issue"]').value = record.Service_Channel;
    document.querySelector('select[name="Dependency"]').value = record.Dependency;
    document.querySelector('select[name="Nature_of_Problem"]').value = record.Nature_Of_Problem;
    document.querySelector('textarea[name="Remarks"]').value = record.Remarks;

    // Save current index before submitting
    chrome.storage.local.set({ currentIndex: currentIndex + 1 }, function() {
        console.log("Current index saved:", currentIndex + 1);

        // Automatically click the submit button (which reloads the page)
        document.querySelector('button[type="submit"]').click();
    });
}

// Function to generate a random delay between min and max milliseconds
function getRandomDelay(minSeconds, maxSeconds) {
    const minMilliseconds = minSeconds * 1000;
    const maxMilliseconds = maxSeconds * 1000;
    return Math.random() * (maxMilliseconds - minMilliseconds) + minMilliseconds;
}

// Function to start processing forms
function processForms() {
    chrome.storage.local.get(['formData', 'currentIndex', 'isProcessing'], function(result) {
        const formData = result.formData;
        let currentIndex = result.currentIndex || 0;
        const isProcessing = result.isProcessing;

        if (!isProcessing) {
            console.log("Processing stopped by user.");
            return;
        }

        if (formData && currentIndex < formData.length) {
            const randomDelay = getRandomDelay(1, 1); // Random delay between 3 and 10 seconds

            console.log(`Processing record ${currentIndex + 1} with a delay of ${randomDelay / 1000} seconds`);

            submissionTimeout = setTimeout(() => {
                chrome.storage.local.get('isProcessing', function(processingResult) {
                    if (processingResult.isProcessing) {
                        fillAndSubmitForm(formData[currentIndex], currentIndex);
                        updateProgress(currentIndex + 1, formData.length);
                    } else {
                        console.log("Processing has been stopped. No submission will occur.");
                    }
                });
            }, randomDelay);
        } else {
            console.log("All records processed. Stopping process.");
            stopProcessing(); // Automatically stop after processing all records
        }
    });
}

// Listen for messages to start or stop processing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startProcessing') {
        chrome.storage.local.set({ isProcessing: true }, function() {
            console.log("Processing started.");
            processForms();
        });
    } else if (message.action === 'stopProcessing') {
        stopProcessing(); // Handle stopping the process
    }
});

// Function to stop processing and reset data
function stopProcessing() {
    clearTimeout(submissionTimeout); // Cancel any pending form submission
    chrome.storage.local.set({ isProcessing: false, currentIndex: 0, formData: [] }, function() {
        console.log("Processing stopped and data reset.");
        // Notify popup to reset progress
        chrome.runtime.sendMessage({ action: 'resetProgress' });
    });
}

// Automatically continue processing after a reload if the process is ongoing
chrome.storage.local.get(['isProcessing'], function(result) {
    if (result.isProcessing) {
        processForms();
    }
});

// Update progress bar in the popup
function updateProgress(submittedCount, totalCount) {
    chrome.runtime.sendMessage({ action: 'updateProgress', submittedCount, totalCount });
}

