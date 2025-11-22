import axios from "axios";

const url = "https://news.nusamandiri.ac.id/berita/mahasiswa-unm-kenalkan-teknologi-ai-ke-siswa-smp-wujudkan-literasi-digital-sejak-dini/";
const jumlahRefresh = 10;

// Random delay antara min dan max (ms)
const randomDelay = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function autoRefresh() {
    console.log(`Mulai akses ${url}`);
    console.log(`Target: ${jumlahRefresh} views\n`);
    
    let sukses = 0;
    let gagal = 0;
    
    for (let i = 1; i <= jumlahRefresh; i++) {
        try {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9',
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache'
            };
            
            const response = await axios.get(url, { 
                headers,
                timeout: 10000 
            });
            
            const waktu = new Date().toLocaleTimeString('id-ID');
            console.log(`[${waktu}] ✓ View #${i}/${jumlahRefresh} - Status: ${response.status}`);
            
            sukses++;
            
            // Random delay 2-5 detik
            const delay = randomDelay(2000, 5000);
            await sleep(delay);
            
        } catch (error) {
            console.log(`✗ View #${i} - Error: ${error.message}`);
            gagal++;
            await sleep(3000);
        }
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`SELESAI!`);
    console.log(`Sukses: ${sukses}`);
    console.log(`Gagal: ${gagal}`);
}

autoRefresh();