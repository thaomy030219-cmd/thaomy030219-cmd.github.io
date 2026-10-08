import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const categories = { 'co-khi': 'wrench', 'cong-cu': 'tool', sach: 'book', game: 'gamepad', 'thu-vien': 'book' };
const formats = { apk: 'ANDROID', exe: 'WINDOWS', msi: 'WINDOWS', epub: 'EBOOK', pdf: 'DOCUMENT', docx: 'DOCUMENT', xlsx: 'DOCUMENT', aab: 'ANDROID-STORE' };
const archives = new Set(['zip', '7z', 'rar']);
const platforms = new Set([...Object.values(formats), 'FILE']);

export function inferFile(name, declared) {
  const ext = String(name).split('.').pop().toLowerCase();
  const platform = formats[ext] || (archives.has(ext) && platforms.has(declared) ? declared : undefined);
  if (!platform) throw new Error(`Tệp ${name}: định dạng chưa hỗ trợ hoặc cần chọn nền tảng cho tệp nén.`);
  if (declared && declared !== platform) throw new Error(`Tệp ${name} là ${platform}, không phải ${declared}.`);
  return { platform, format: ext.toUpperCase() };
}

export function metadata(body) {
  const blocks = [...String(body || '').matchAll(/```app-catalog\s*\n([\s\S]*?)\n```/g)];
  if (!blocks.length) return null;
  if (blocks.length !== 1) throw new Error('Chỉ dùng một khối app-catalog trong mỗi bản phát hành.');
  const data = JSON.parse(blocks[0][1]);
  if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Thông tin ứng dụng phải là một đối tượng JSON.');
  return data;
}

export function compareVersions(a, b) {
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const d = (left[i] || 0) - (right[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

export function compileCatalog(seed, releases, repo) {
  const apps = new Map(seed.map(app => [app.id, { ...app }]));
  if (apps.size !== seed.length) throw new Error('Danh sách gốc có mã ứng dụng trùng.');
  const sorted = releases.filter(r => !r.draft && !r.prerelease && r.published_at)
    .sort((a, b) => a.published_at.localeCompare(b.published_at) || a.id - b.id);
  for (const release of sorted) {
    try {
      const info = metadata(release.body);
      if (!info) continue;
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/.test(info.id || '')) throw new Error('Mã ứng dụng không hợp lệ.');
      if (!/^\d+(?:\.\d+){1,3}$/.test(info.version || '')) throw new Error('Phiên bản cần có dạng 1.0 hoặc 1.0.9.');
      const old = apps.get(info.id);
      const name = info.name ?? old?.name;
      const description = info.description ?? old?.description;
      const category = info.category ?? old?.category;
      if (typeof name !== 'string' || !name.trim() || name.length > 200) throw new Error('Thiếu tên ứng dụng hợp lệ.');
      if (typeof description !== 'string' || !description.trim() || description.length > 2000) throw new Error('Thiếu mô tả ứng dụng hợp lệ.');
      if (!Object.hasOwn(categories, category)) throw new Error('Danh mục không hợp lệ.');
      let assets = (release.assets || []).filter(a => a.state === 'uploaded' && a.size > 0);
      if (info.file) assets = assets.filter(a => a.name === info.file);
      if (assets.length !== 1) throw new Error('Cần đúng một tệp đã tải xong; kiểm tra tên tệp trong thông tin ứng dụng.');
      const asset = assets[0];
      const type = inferFile(asset.name, info.platform ?? old?.platform);
      if (old && old.platform !== type.platform) throw new Error('Không được dùng cùng mã cho hai nền tảng. Hãy thêm mục mới.');
      const url = new URL(asset.browser_download_url);
      const expectedPath = `/${repo}/releases/download/`;
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.startsWith(expectedPath)) throw new Error('Link tải không thuộc kho tập trung.');
      if (old && compareVersions(info.version, old.version) < 0) continue;
      const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(release.published_at));
      apps.set(info.id, { id: info.id, name: name.trim(), description: description.trim(), category, ...type, version: info.version, date, icon: categories[category], download: url.href, file: asset.name, size: asset.size, digest: asset.digest || null, release: release.html_url });
    } catch (error) {
      throw new Error(`${release.tag_name}: ${error.message}`);
    }
  }
  return [...apps.values()];
}

export async function listReleases(repo, token) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '')) throw new Error('Thiếu GITHUB_REPOSITORY hợp lệ.');
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const result = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`, { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Không đọc được GitHub Releases: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('GitHub trả về danh sách không hợp lệ.');
    result.push(...batch);
    if (batch.length < 100) return result;
  }
}

async function main() {
  const seed = JSON.parse(await fs.readFile('catalog.seed.json', 'utf8'));
  const releases = await listReleases(process.env.GITHUB_REPOSITORY, process.env.GH_TOKEN);
  const apps = compileCatalog(seed, releases, process.env.GITHUB_REPOSITORY);
  await fs.mkdir('_site', { recursive: true });
  for (const name of ['index.html', 'upload.html', 'app-ads.txt']) await fs.copyFile(name, `_site/${name}`);
  await fs.writeFile('_site/catalog.json', JSON.stringify({ schema: 1, generatedAt: new Date().toISOString(), apps }, null, 2));
  console.log(`Đã cập nhật ${apps.length} mục, đọc ${releases.length} bản phát hành.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
