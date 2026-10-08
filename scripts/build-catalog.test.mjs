import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCatalog, inferFile, metadata, compareVersions } from './build-catalog.mjs';

const repo = 'owner/hub';
const seed = [{ id: 'APP-004', name: 'Tra Thép Hình', description: 'Mô tả', category: 'co-khi', platform: 'WINDOWS', format: 'EXE', version: '1.0.8', date: '08/10/2026', icon: 'wrench', download: 'https://github.com/owner/old/releases/download/v1/old.exe' }];
const info = { id: 'APP-004', version: '1.0.9', file: 'setup.exe' };
function release(data = info, overrides = {}) {
  return { id: 1, tag_name: 'app-004-v1.0.9', published_at: '2026-10-08T19:00:00Z', html_url: 'https://github.com/owner/hub/releases/tag/app-004-v1.0.9', body: '```app-catalog\n' + JSON.stringify(data) + '\n```', assets: [{ name: data.file || 'setup.exe', state: 'uploaded', size: 100, browser_download_url: `https://github.com/${repo}/releases/download/app-004-v1.0.9/setup.exe`, digest: 'sha256:test' }], ...overrides };
}
test('giữ nguyên danh sách cũ khi không có release', () => assert.deepEqual(compileCatalog(seed, [], repo), seed));
test('cập nhật đúng mục, kế thừa thông tin và ngày Việt Nam', () => {
  const apps = compileCatalog(seed, [release()], repo);
  assert.equal(apps.length, 1); assert.equal(apps[0].version, '1.0.9'); assert.equal(apps[0].name, seed[0].name); assert.equal(apps[0].date, '09/10/2026'); assert.equal(apps[0].digest, 'sha256:test');
});
test('tự nhận diện Android, Windows, sách, tài liệu và AAB', () => {
  for (const [file, platform] of Object.entries({ 'a.apk': 'ANDROID', 'a.EXE': 'WINDOWS', 'a.msi': 'WINDOWS', 'a.epub': 'EBOOK', 'a.pdf': 'DOCUMENT', 'a.docx': 'DOCUMENT', 'a.xlsx': 'DOCUMENT', 'a.aab': 'ANDROID-STORE' })) assert.equal(inferFile(file).platform, platform);
});
test('tệp nén cần nền tảng, không đoán nhầm', () => { assert.throws(() => inferFile('a.zip')); assert.equal(inferFile('a.7z', 'WINDOWS').platform, 'WINDOWS'); });
test('không thêm bản nháp hoặc thử nghiệm', () => assert.deepEqual(compileCatalog(seed, [release(info, { draft: true }), release(info, { prerelease: true })], repo), seed));
test('không làm trùng mục và lấy đúng bản mới dù API đảo thứ tự', () => {
  const newer = release({ ...info, version: '1.0.10' }, { id: 2, published_at: '2026-10-10T01:00:00Z' });
  assert.equal(compileCatalog(seed, [newer, release()], repo)[0].version, '1.0.10');
});
test('không tự hạ phiên bản', () => assert.deepEqual(compileCatalog(seed, [release({ ...info, version: '1.0.7' })], repo), seed));
test('release thiếu tệp không được đưa lên web', () => assert.throws(() => compileCatalog(seed, [release(info, { assets: [] })], repo), /tệp/));
test('tệp chưa tải xong không được đưa lên web', () => { const r = release(); r.assets[0].state = 'new'; assert.throws(() => compileCatalog(seed, [r], repo)); });
test('tên tệp phải khớp chính xác', () => assert.throws(() => compileCatalog(seed, [release(info, { assets: [{ ...release().assets[0], name: 'other.exe' }] })], repo)));
test('không ghi đè mục Windows bằng APK', () => assert.throws(() => compileCatalog(seed, [release({ ...info, file: 'app.apk' })], repo), /không phải/));
test('không chấp nhận link tải sang nơi khác', () => { const r = release(); r.assets[0].browser_download_url = 'https://evil.example/a.exe'; assert.throws(() => compileCatalog(seed, [r], repo), /Link tải/); });
test('thêm ứng dụng mới và đổi danh mục', () => { const r = release({ id: 'app-moi', name: 'Ứng dụng mới', description: 'Mô tả', category: 'cong-cu', version: '1.0', file: 'app.apk' }); const apps = compileCatalog(seed, [r], repo); assert.equal(apps.length, 2); assert.equal(apps[1].platform, 'ANDROID'); assert.equal(apps[1].icon, 'tool'); });
test('JSON lỗi, danh mục sai và phiên bản sai bị chặn', () => { assert.throws(() => metadata('```app-catalog\n{bad}\n```')); for (const data of [{ ...info, category: 'sai' }, { ...info, version: 'bad' }]) assert.throws(() => compileCatalog(seed, [release(data)], repo)); });
test('release không có metadata không ảnh hưởng website', () => assert.deepEqual(compileCatalog(seed, [release(info, { body: 'Ghi chú thông thường' })], repo), seed));
test('so sánh phiên bản bằng số', () => { assert.equal(compareVersions('1.0.10', '1.0.9'), 1); assert.equal(compareVersions('1.0', '1.0.0'), 0); });
