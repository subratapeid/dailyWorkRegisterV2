document.addEventListener('DOMContentLoaded', () => {
    // Check login status when the popup is loaded
    checkLoginStatus();
});

function checkLoginStatus() {
    // Fetch the token from cookies and check login status
    chrome.storage.local.get(['tempToken', 'authToken'], function(tokens) {
        if (!tokens.authToken && tokens.tempToken) {
            document.getElementById('status').style.display = 'block';
            document.getElementById('login').disabled = true;
            console.log('verifying temp Token');
            console.log(`Temp Token: ${tokens.tempToken}`);
            
            // Make an API request to verify the token
            verifyToken(tokens.tempToken)
                .then(result => {
                document.getElementById('status').style.display = 'none';
                document.getElementById('login').disabled = false;
                console.log(`Result: ${result.message}`);
                    if (result.status) {
                        chrome.storage.local.remove('tempToken');
                        chrome.storage.local.set({ authToken: result.message });
                        document.getElementById('processSection').style.display = 'block';
                        document.getElementById('logout').style.display = 'block';
                        document.getElementById('login').style.display = 'none';
                    } else {
                        displayError(result.message);
                        chrome.storage.local.set({
                            authToken: false,
                            tempToken: false
                        });
                        document.getElementById('processSection').style.display = 'none';
                        document.getElementById('logout').style.display = 'none';
                        document.getElementById('login').style.display = 'block';
                    }
                })
                .catch(() => {
                    document.getElementById('processSection').style.display = 'none';
                    document.getElementById('logout').style.display = 'none';
                    document.getElementById('login').style.display = 'block';
                });
            } else if(!tokens.authToken && !tokens.tempToken) {
                // Auth token Available, show Progress section
                document.getElementById('processSection').style.display = 'none';
                document.getElementById('logout').style.display = 'none';
                document.getElementById('login').style.display = 'block';
            } else {
            console.log(`Auth Token: ${tokens.authToken}`);
            // Auth token Available, show Progress section
            document.getElementById('processSection').style.display = 'block';
            document.getElementById('logout').style.display = 'block';
            document.getElementById('login').style.display = 'none';
        }
    });
}

function verifyToken(token) {
    
    // Temp token verification endpoint
    const verifyTokenUrl = `https://script.google.com/macros/s/AKfycbxQXNRkCB9Vxn_3nqf8hXdDOwCSrVkbIB2MPVYyUnAvGPCt5cb1xoTSjVjbm9061Q_Vcw/exec?tempToken=${token}`;

    return fetch(verifyTokenUrl)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Return success message and token
                    return {
                        status: true,
                        message: data.data.Login_Session_Token || 'Login Session Token not available'
                    };
                } else {
                    // Return actual error message from response
                    return {
                        status: false,
                        message: data.message || 'Unknown error occurred'
                    };
                }
            })
            .catch(error => {
                return {
                    status: false,
                    message: 'Unable To Verify Login Status'
                };
            });
        }

// Event listener for login button
document.getElementById('login').addEventListener('click', () => {
    // Generate a temporary token and redirect to login page
    const tempToken = generateTempToken();
    // chrome.storage.local.remove('authToken');
    chrome.storage.local.set({ tempToken: tempToken }, () => {
        const loginUrl = `https://subratap.gitlab.io/tools/index.html?token=${tempToken}`;
        chrome.tabs.create({ url: loginUrl });
    });
});

// Event listener for login button
document.getElementById('logout').addEventListener('click', () => {
    // Show a confirmation alert
    const confirmed = confirm('Are you sure you want to log out?');
    // If the user confirms, proceed with the logout
    if (confirmed) {
        document.getElementById('processSection').style.display = 'none';
        document.getElementById('logout').style.display = 'none';
        document.getElementById('login').style.display = 'block';

        chrome.storage.local.set({
            authToken: false,
            tempToken: false
        });
    }
});

function generateTempToken() {
    return Date.now().toString(); // Example token; use a more secure method in production
}

// Event listener for start button
document.getElementById('start').addEventListener('click', async () => {
    try {
        // Fetch the sheet URL from the additional endpoint
        const sheetUrl = await fetchSheetUrl();
        // Fetch All Activity List from the sheet
        const dataUrl = `https://script.google.com/macros/s/AKfycbxIo2mECUZpfSCAwv-SjwFxR0ry9Zv6-TNC_niLCSPl75NLaKUCqQmCo6Ov3qpEUcPO6g/exec?sheetUrl=${sheetUrl}`;
        console.log(dataUrl);
        
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
            .catch(error => displayError('Error fetching form data'));
    } catch (error) {
        displayError('Error: ' + error.message);
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
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('authToken', (token) => {
            const sheetUrlEndpoint = `https://script.google.com/macros/s/AKfycbxQXNRkCB9Vxn_3nqf8hXdDOwCSrVkbIB2MPVYyUnAvGPCt5cb1xoTSjVjbm9061Q_Vcw/exec?action=sheetUrl&authToken=${token.authToken}`;

            fetch(sheetUrlEndpoint)
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        if(!data.data.Sheet_Url==''){
                            resolve(data.data.Sheet_Url); // Resolve the promisse
                        }else{
                            displayError('Your Sheet Is Not Configured')
                        }
                        
                    } else {
                        reject(new Error(data.message || 'Failed to fetch sheet URL'));
                    }
                })
                .catch(error => {
                    displayError('Error fetching sheet URL: ' + error.message);
                    reject(error); // Reject the promise with the error
                });
        });
    });
}


function displayError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.innerText = message;
        errorElement.style.display = 'block';
    }
}
