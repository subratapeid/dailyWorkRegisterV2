// Fetch the sheet URL from the additional endpoint
        const sheetUrl = await fetchSheetUrl();

        // Fetch All Activity List from the sheet
        const dataUrl = `https://script.google.com/macros/s/AKfycbxIo2mECUZpfSCAwv-SjwFxR0ry9Zv6-TNC_niLCSPl75NLaKUCqQmCo6Ov3qpEUcPO6g/exec?sheetUrl=${sheetUrl}`;
        console.log(dataUrl);
        
        fetch(dataUrl)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {

                    // // Map remarks with data and log to console
                    // const finalData = data.map((item, index) => {
                    //     // Append remarks to each item without altering the original structure
                    //     return { ...item, remarks: remarks[index] || 'No Remarks' };
                    // });

                    // // Log the entire final array with remarks at once
                    // console.log(finalData);


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