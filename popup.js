document.addEventListener('DOMContentLoaded', () => {
    // Check login status when the popup is loaded
    checkLoginStatus();
    populateProfileOptions(); // Populate profile names on load

});
// Retrieve userId from local storage
// chrome.storage.local.get('userId', (result) => {
//     const userId = result.userId;
//     if (userId) {
//         console.log("Retrieved userId from Chrome storage:", userId);
//     } else {
//         console.log("No userId found in Chrome storage.");
//     }
// });

const errorElement = document.getElementById('error-message');
function checkLoginStatus() {
    // Fetch the token from cookies and check login status
    chrome.storage.local.get(['tempToken', 'authToken', 'userFirstName'], function(tokens) {
        if (!tokens.authToken && tokens.tempToken) {
            document.getElementById('status').style.display = 'block';
            document.getElementById('login').disabled = true;
            // console.log('verifying temp Token');
            // console.log(`Temp Token: ${tokens.tempToken}`);
            
            // Make an API request to verify the temp token
            verifyToken('tempToken', tokens.tempToken)
                .then(result => {
                    chrome.storage.local.get('userFirstName', (result) => {
                        const userFirstName = result.userFirstName || 'User';
                        if(userFirstName){
                            document.getElementById('userFirstName').textContent = userFirstName;
                        }
                        // console.log(userFirstName);
                    });

                document.getElementById('status').style.display = 'none';
                document.getElementById('login').disabled = false;
                console.log(`Result: ${result.message}`);
                console.log(`Result: ${result.status}`);
                    if (result.status) {
                        chrome.storage.local.remove('tempToken');
                        chrome.storage.local.get('userFirstName', (result) => {
                            const userFirstName = result.userFirstName;
                            userFirstName.textContent = userFirstName;
                            // console.log(userFirstName);
                            
                        });
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
                // Auth token temp token not Available, hide Progress section
                document.getElementById('processSection').style.display = 'none';
                document.getElementById('logout').style.display = 'none';
                document.getElementById('login').style.display = 'block';
            } else {
                chrome.storage.local.get('userFirstName', (result) => {
                    const userFirstName = result.userFirstName || 'User';
                    if(userFirstName){
                        document.getElementById('userFirstName').textContent = userFirstName;
                    }
                    // console.log(userFirstName);
                });
            console.log(`Auth Token: ${tokens.authToken}`);
            // Auth token Available, show Progress section
            document.getElementById('processSection').style.display = 'block';
            document.getElementById('logout').style.display = 'block';
            document.getElementById('login').style.display = 'none';

            // Make an API request to verify the auth token
            verifyToken('authToken', tokens.authToken)
                .then(result => {
                document.getElementById('status').style.display = 'none';
                document.getElementById('login').disabled = false;
                console.log(`Result: ${result}`);
                    if (result.status) {
                        chrome.storage.local.remove('tempToken');
                        // chrome.storage.local.set({ authToken: result.message });
                        // chrome.storage.local.get('userFirstName', (result) => {
                        //     const userFirstName = result.userFirstName;
                        //     document.getElementById('userFirstName').textContent = userFirstName;
                        //     // console.log(userFirstName);
                        // });
                        document.getElementById('processSection').style.display = 'block';
                        document.getElementById('logout').style.display = 'block';
                        document.getElementById('login').style.display = 'none';
                    } else {
                        displayError(result.message);
                        // chrome.storage.local.set({
                        //     authToken: false,
                        //     tempToken: false
                        // });
                        document.getElementById('processSection').style.display = 'none';
                        document.getElementById('logout').style.display = 'none';
                        document.getElementById('login').style.display = 'block';
                    }
                })
        }
    });
}

function verifyToken(tokenType, token) {
    
    // Temp token verification endpoint
    const verifyTokenUrl = `https://script.google.com/macros/s/AKfycbxQXNRkCB9Vxn_3nqf8hXdDOwCSrVkbIB2MPVYyUnAvGPCt5cb1xoTSjVjbm9061Q_Vcw/exec?tokenType=${tokenType}&token=${token}`;

    return fetch(verifyTokenUrl)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // console.log('after Verify:'+ data.data.Login_Session_Token);
                    chrome.storage.local.set({ authToken: data.data.Login_Session_Token });
                    chrome.storage.local.set({ userId: data.data.User_Id });
                    chrome.storage.local.set({ userFirstName: data.data.User_First_Name });
                    // Return success message and token
                    return {
                        status: true,
                        message: data.data.Login_Session_Token|| 'Token Verified'
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
    const appName = 'Daily Activity Entry Extention';
    // chrome.storage.local.remove('authToken');
    chrome.storage.local.set({ tempToken: tempToken }, () => {
        const loginUrl = `https://subratap.gitlab.io/tools/index.html?page=authenticate&token=${tempToken}&app=${appName}`;
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
            tempToken: false,
            userFirstName: false
        });
    }
});

function generateTempToken() {
    return Date.now().toString(); // Example token; use a more secure method in production
}

// Populate profile names in dropdown
function populateProfileOptions() {
    chrome.storage.local.get('userId', (result) => {
    fetchProfiles(result.userId).then(response => {
        const profileSelect = document.getElementById('profileSelect');
        profileSelect.innerHTML = ''; // Clear existing options

        // Create and add the disabled "Select Profile" option
        const defaultOption = document.createElement('option');
        defaultOption.value = ''; // No value for the default option
        defaultOption.textContent = 'Select A Profile'; // Display text
        defaultOption.disabled = true; // Disable this option
        defaultOption.selected = true; // Set it as selected by default
        profileSelect.appendChild(defaultOption); // Append to the select element

        if (response.status === 'success' && response.data.length > 0) {
            response.data.forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.ProfileName; // Use ProfileID as the value
                option.textContent = profile.ProfileName; // Display ProfileName
                profileSelect.appendChild(option);
            });
        } else {
            // Create and add "No profile found" option
            const noProfileOption = document.createElement('option');
            noProfileOption.value = ''; // No value for this option
            noProfileOption.textContent = 'No profile found'; // Display text
            noProfileOption.disabled = true; // Disable this option
            noProfileOption.selected = true; // Set it as selected
            profileSelect.appendChild(noProfileOption); // Append to the select element
        }
    }).catch(error => {
        console.error('Error fetching profiles:', error);
        // Optionally handle fetch errors
    });
})
}



function fetchProfiles(userId) {
    const profileUrl = `https://script.google.com/macros/s/AKfycbwRT8r9qGkwe_e_1u4jQ4TVrLTTnSmNj2s9O8-iskIoDj_w4PWQL_kHu0dh-b9Me20jrw/exec?action=getProfiles&userId=${userId}`;
    
    return fetch(profileUrl)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log(data.data);
                
                return data;
            } else {
                displayError('Failed to fetch profiles');
                return [];
            }
        })
        .catch(error => {
            console.error('Error fetching profiles:', error);
            displayError('Error fetching profiles');
            return [];
        });
}

// Count remarks as user types
document.getElementById('remarksInput').addEventListener('input', () => {
    const remarks = document.getElementById('remarksInput').value.split('\n').filter(line => line.trim() !== '');
    document.getElementById('remarksCount').textContent = `Remarks Count: ${remarks.length}`;
});

const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');

// Event listener for start button
startBtn.addEventListener('click', async () => {
    try {
    const profileName = document.getElementById('profileSelect').value;
    const remarks = document.getElementById('remarksInput').value.split('\n').filter(line => line.trim() !== '');
    const remarksCount = remarks.length;
    startBtn.disabled=true;
    stopBtn.disabled=false;
    errorElement.style.display = 'none';
    if (!validation()){
        startBtn.disabled=false;
        stopBtn.disabled=true;
        return
    };
    function validation() {
        if(profileName==''){
           displayError('Please Select A Profile');
           return false;
        }else if(remarksCount==0){
            displayError('Please Enter Your Remarks');
            return false;
        } else {
            return true;
        }
    }
    chrome.storage.local.get('userId', (result) => {
        const userId = result.userId;
        // Fetch All Activity data from the sheet
        const dataUrl = `https://script.google.com/macros/s/AKfycbxkF2fW2S5afoFjjhYuxTBRTAcUxk-p2b-a11pJpFO1MVsGwh80XGH1-PuPpcCqUl94Aw/exec?userId=${userId}&profileName=${profileName}&remarksCount=${remarksCount}`;
        console.log(dataUrl);

        fetch(dataUrl)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && Array.isArray(data.data)) {

                    // Map remarks with data and log to console
                    const finalData = data.data.map((item, index) => {
                        // Append remarks to each item without altering the original structure
                        return { ...item, Remarks: remarks[index] || 'No Remarks' };
                    });

            // Log the entire final array with remarks at once
            console.log(finalData);

            chrome.storage.local.set({ formData: finalData, currentIndex: 0, isProcessing: true }, () => {
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
            console.log(data.length);
            
            displayError('Failed to fetch form data');
        }
 

            })
            .catch(error => displayError('Error fetching form data'));
        });
    } catch (error) {
        displayError('Error: ' + error.message);
        console.error('Error:', error.message);
    }
    
});

stopBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopProcessing' });
    });
});

function updateProgress(submittedCount, totalCount) {
    startBtn.disabled=true;
    stopBtn.disabled=false;
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = (submittedCount / totalCount) * 100;
    
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.innerText = `${submittedCount}/${totalCount} (${progressPercentage.toFixed(2)}%)`;
    }
}

function resetProgress() {
    const progressBar = document.getElementById('progress-bar');
    startBtn.disabled=false;
    stopBtn.disabled=true;
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


function displayError(message) {
    
    if (errorElement) {
        errorElement.innerText = message;
        errorElement.style.display = 'block';
    }
}
