document.addEventListener('DOMContentLoaded', () => {
    // Check login status when the popup is loaded
    checkLoginStatus();
});

function checkLoginStatus() {
    // Fetch the token from cookies and check login status
    chrome.storage.local.get(['authToken'], function(result) {
        if (result.authToken) {
            // Make an API request to verify the token
            verifyToken(result.authToken)
                .then(loggedIn => {
                    if (loggedIn) {
                        document.getElementById('processSection').style.display = 'block';
                        document.getElementById('login').style.display = 'none';
                    } else {
                        document.getElementById('processSection').style.display = 'none';
                        document.getElementById('login').style.display = 'block';
                    }
                })
                .catch(() => {
                    document.getElementById('processSection').style.display = 'none';
                    document.getElementById('login').style.display = 'block';
                });
        } else {
            // No token, show login button
            document.getElementById('processSection').style.display = 'none';
            document.getElementById('login').style.display = 'block';
        }
    });
}

function verifyToken(token) {
    // Replace with your token verification endpoint
    const verifyTokenUrl = `https://yourdomain.com/verify-token?token=${token}`;

    return fetch(verifyTokenUrl, { credentials: 'include' })
        .then(response => response.json())
        .then(data => data.status === 'success')
        .catch(() => false);
}

// Event listener for login button
document.getElementById('login').addEventListener('click', () => {
    // Generate a temporary token and redirect to login page
    const tempToken = generateTempToken();
    chrome.storage.local.set({ authToken: tempToken }, () => {
        const loginUrl = `https://yourdomain.com/login?token=${tempToken}`;
        chrome.tabs.create({ url: loginUrl });
    });
});

function generateTempToken() {
    return Date.now().toString(); // Example token; use a more secure method in production
}

// Event listener for start button
document.getElementById('start').addEventListener('click', async () => {
    try {
        // Fetch the sheet URL from the additional endpoint
        const sheetUrl = await fetchSheetUrl();
        
        const dataUrl = `https://script.google.com/macros/s/AKfycbxLnw0JtwECzMGqXwgVTsdi4brlmq0-kWzYyYAYaLvJW-k4maP1_2EGNcOSXKxM8zxR6w/exec?sheetUrl=${encodeURIComponent(sheetUrl)}`;
        
        fetch(dataUrl)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    chrome.storage.local.set({ formData: data.data, currentIndex: 0, isProcessing: true }, () => {
                        console.log("Form data saved to local storage.");

                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            chrome.scripting.executeScript({
                                target: { tabId: tabs[0].id },
                                files: ['content.js'] // Ensure content.js is injected
                            }, () => {
                                chrome.tabs.sendMessage(tabs[0].id, { action: 'startProcessing' });
                            });
                        });
                    });
                } else {
                    displayError('Failed to fetch form data');
                }
            })
            .catch(error => displayError('Error fetching form data: ' + error.message));
    } catch (error) {
        console.error('Error:', error.message);
    }
});

document.getElementById('stop').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopProcessing' });
    });
});

function updateProgress(submittedCount, totalCount) {
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = (submittedCount / totalCount) * 100;
    
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.innerText = `${submittedCount}/${totalCount} (${progressPercentage.toFixed(2)}%)`;
    }
}

function resetProgress() {
    const progressBar = document.getElementById('progress-bar');
    
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.innerText = '0/0 (0%)';
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateProgress') {
        updateProgress(message.submittedCount, message.totalCount);
    } else if (message.action === 'resetProgress') {
        resetProgress();
    }
});

function fetchSheetUrl() {
    const sheetUrlEndpoint = 'https://script.google.com/macros/s/YOUR_SECOND_SCRIPT_ID/exec';

    return fetch(sheetUrlEndpoint)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                return data.sheetUrl; // Return the sheet URL from the response
            } else {
                throw new Error(data.message || 'Failed to fetch sheet URL');
            }
        })
        .catch(error => {
            displayError('Error fetching sheet URL: ' + error.message);
            throw error; // Re-throw the error to handle it in the caller function
        });
}

function displayError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.innerText = message;
        errorElement.style.display = 'block';
    }
}
