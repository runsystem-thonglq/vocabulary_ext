// const puppeteer = require('puppeteer');

// async function scrapeLaban(query) {
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();
//     await page.goto(`https://dict.laban.vn/find?type=1&query=${query}`, { waitUntil: 'domcontentloaded' });

//     const result = await page.evaluate(() => document.body.innerHTML);
//     console.log(result);

//     await browser.close();
// }

// scrapeLaban('hello');

const axios = window.axios;

window.crawlLaban = async function crawlLaban(query) {
      const data = {
            pronunciation: '',
            datas: [], // sẽ chứa các loại (Trợ động từ, Động từ, etc.)
        };

    try {
        const url = `https://cors-anywhere.herokuapp.com/https://dict.laban.vn/${query}`;
        const response = await axios.get(url,
            
                // {
                // headers: {
                //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                // }
        );

        // Create a temporary DOM element to parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.data, 'text/html');

        // Get pronunciation and audio
        const pronunciation = doc.querySelector('.world h2.fl > span')?.textContent?.trim();
        data.pronunciation = pronunciation;
        // const audios = doc.querySelector('.world #sound source')?.getAttribute('src');

      
        // Tìm tất cả các section
        const sections = doc.querySelector('#content_selectable.content');
        let currentType = null;
        let currentMeaning = null;

        // Get all direct div children of the first non-hidden slide_content
        const contentDivs = Array.from(sections?.querySelectorAll('.slide_content:not(.hidden) div') || []);

        contentDivs.forEach(element => {
            console.log(element,4);
            // Kiểm tra nếu là tiêu đề loại từ
            if (element.classList.contains('bg-grey') && element.classList.contains('bold')) {
                currentType = {
                    type: element.textContent.trim(),
                    description: '',
                    meanings: []
                };
                data.datas.push(currentType);
            }
            // Kiểm tra nếu là mô tả của loại từ
            else if (!element.classList.contains('margin25') && !element.classList.contains('green')) {
                if (currentType) {
                    currentType.description = element.textContent.trim();
                }
                else{
                    currentType = {
                        type: "",
                        description: element.textContent.trim(),
                        meanings: []
                    }; 
                    data.datas.push(currentType);
                }
            }
            // Kiểm tra nếu là nghĩa của từ
            else if (element.classList.contains('green') && element.classList.contains('bold')) {
                currentMeaning = {
                    meaning: element.textContent.trim(),
                    examples: []
                };
                if (currentType) {
                    currentType.meanings.push(currentMeaning);
                }
                else{
                    currentType = {
                        type: "",
                        description: "",
                        meanings: [currentMeaning]
                    };
                    data.datas.push(currentType);
                }
            }
            // Kiểm tra nếu là ví dụ
            else if (element.classList.contains('margin25')) {
                const prevEl = element.previousElementSibling;
                if (prevEl?.classList.contains('color-light-blue') && currentMeaning) {
                    currentMeaning.examples.push({
                        en: prevEl.textContent.trim(),
                        vi: element.textContent.trim()
                    });
                }
            }
        });

        return data;
    } catch (error) {
        console.error('Lỗi khi crawl:', error.message);
        // Add specific handling for CORS error (403)
        if (error.response?.status === 403) {
            console.log('CORS error detected. Please visit https://cors-anywhere.herokuapp.com/corsdemo and request temporary access.');
            requestCorsAccess();
        }
        return {
            pronunciation: '',
            datas: []
        }
    }
};

        // Add function to request CORS access
        const requestCorsAccess = async () => {
          try {
            const corsWindow = window.open('https://cors-anywhere.herokuapp.com/corsdemo', '_blank');
            if (corsWindow) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for page load
                const message = `
                    const button = document.querySelector('input[type="submit"]');
                    if (button) {
                        button.click();
                        setTimeout(() => window.close(), 1000);
                    }
                `;
                console.log(message,5,corsWindow);
                corsWindow.eval(message)
            }
          } catch (error) {
            console.error('Error requesting CORS access:', error);
          }
        };

        

        // ... existing code ...
