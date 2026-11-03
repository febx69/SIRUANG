import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\ADVAN\\.gemini\\antigravity-ide\\brain\\342e6150-7755-44ea-b50f-bef79147bcc4';

async function runLiveTest() {
  console.log('Membuka browser Google Chrome secara langsung di layar Anda...');

  // Buka Chrome dengan tampilan GUI langsung (headless: false)
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  try {
    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    // 1. Setup Auth di LocalStorage
    console.log('1. Membuka http://localhost:8080/ dan setup akun admin & OB...');
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      const user = {
        id: 'admin_test_id',
        username: 'admin',
        role: 'admin',
        is_ob: true
      };
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('loginTimestamp', Date.now().toString());
    });

    // 2. Tampilkan Dashboard dengan 4 Kartu
    console.log('2. Memuat Dashboard dengan 4 Kartu Layanan...');
    await page.goto('http://localhost:8080/#/', { waitUntil: 'networkidle0' });
    // Tunggu splash screen selesai dan animasi kartu
    await new Promise(r => setTimeout(r, 3800));

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_dashboard.png'), fullPage: true });

    // 3. Masuk ke Menu Monev Kebersihan
    console.log('3. Mengarahkan ke Menu Monev Kebersihan...');
    await page.goto('http://localhost:8080/#/kebersihan', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_monev.png'), fullPage: true });

    // 4. Buka Modal Lapor Kebersihan Hari Ini
    console.log('4. Membuka Form Laporan Harian OB...');
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.includes('Lapor Kebersihan Hari Ini')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_form_ob.png') });

    // 5. Test Validasi Wajib Isi (Submit tanpa isi foto & keterangan)
    console.log('5. Menguji Validasi Wajib Isi: Menekan Kirim tanpa foto & keterangan...');
    const submitBtns = await page.$$('button[type="submit"]');
    if (submitBtns.length > 0) {
      await submitBtns[0].click();
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_validation_toast.png') });
    }

    // Tutup Modal Form OB
    console.log('6. Menutup modal form OB...');
    const closeBtns = await page.$$('button');
    for (const cb of closeBtns) {
      const txt = await page.evaluate(el => el.textContent, cb);
      if (txt && txt.trim() === 'Batal') {
        await cb.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // 7. Buka Tab Pengaduan Kebersihan
    console.log('7. Beralih ke Tab Pengaduan Kebersihan...');
    const tabs = await page.$$('[role="tab"]');
    for (const t of tabs) {
      const txt = await page.evaluate(el => el.textContent, t);
      if (txt && txt.includes('Pengaduan Kebersihan')) {
        await t.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));

    // Buka Modal Buat Pengaduan
    console.log('8. Membuka Form Pengaduan Baru...');
    const aduanBtns = await page.$$('button');
    for (const ab of aduanBtns) {
      const txt = await page.evaluate(el => el.textContent, ab);
      if (txt && txt.includes('Buat Pengaduan Baru')) {
        await ab.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_form_pengaduan.png') });

    // Tutup Modal Pengaduan
    const cancelBtns = await page.$$('button');
    for (const cb of cancelBtns) {
      const txt = await page.evaluate(el => el.textContent, cb);
      if (txt && txt.trim() === 'Batal') {
        await cb.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // 8. Buka Tab Rekap & Arsip (Admin)
    console.log('9. Beralih ke Tab Rekap & Arsip (Admin)...');
    const tabsAdmin = await page.$$('[role="tab"]');
    for (const t of tabsAdmin) {
      const txt = await page.evaluate(el => el.textContent, t);
      if (txt && txt.includes('Rekap & Arsip (Admin)')) {
        await t.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_admin_rekap.png') });

    console.log('Pengujian browser langsung selesai! Browser akan tetap terbuka beberapa detik agar Anda dapat melihatnya.');
    await new Promise(r => setTimeout(r, 5000));

  } finally {
    await browser.close();
  }
}

runLiveTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
