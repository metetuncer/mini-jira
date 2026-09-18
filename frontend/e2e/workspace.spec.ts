import { test, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const projectId = '11111111-1111-1111-1111-111111111111';
const sprintId = '22222222-2222-2222-2222-222222222222';
const userId = '33333333-3333-3333-3333-333333333333';
const memberId = '44444444-4444-4444-4444-444444444444';
const names = [
  'Kullanıcı kayıt akışını tamamla',
  'JWT yenileme hatasını düzelt',
  'Proje panosu bileşenlerini oluştur',
  'API doğrulama kurallarını ekle',
  'Mobil navigasyonu iyileştir',
  'Veritabanı indekslerini düzenle',
  'Görev filtrelerini test et',
  'E-posta formunu tasarla',
  'Dosya yükleme akışını geliştir',
  'Erişilebilirlik kontrolü yap',
  'Üye rolleri için test yaz',
  'Hata mesajlarını düzenle',
  'Arama performansını iyileştir',
  'Sürüm notlarını hazırla',
  'Proje dokümantasyonunu güncelle'
];
async function setup(page: Page) {
  const calls: { method: string; path: string; body: any }[] = [];
  let tasks = names.map((title, i) => ({
    id: `${String(i + 1).padStart(8, '0')}-0000-0000-0000-000000000000`,
    projectId,
    title,
    description: 'Kabul kriterleri ve uygulama detayları.',
    status: i % 3,
    priority: i % 3,
    order: i,
    assigneeId: i % 4 === 0 ? null : i % 2 === 0 ? memberId : userId,
    createdById: userId,
    createdAt: `2026-09-${String((i % 5) + 1).padStart(2, '0')}T10:00:00Z`,
    labelIds: i % 2 === 0 ? ['label-1'] : ['label-2'],
    sprintId: i < 6 ? sprintId : null,
    issueType: i % 4,
    storyPoints: [2, 3, 5, 8][i % 4],
    dueDate: i % 3 === 0 ? '2026-09-15' : null
  }));
  let sprints: any[] = [
    {
      id: sprintId,
      projectId,
      name: 'Sprint 1 — Temel deneyim',
      goal: 'Üyelerin ilk görevini oluşturabildiği akışı tamamlamak.',
      startDate: '2026-09-01',
      endDate: '2026-09-15',
      status: 0,
      taskCount: 6,
      doneCount: 2,
      totalPoints: 26,
      donePoints: 8
    }
  ];
  await page.addInitScript(
    ({ userId }) => {
      localStorage.setItem('minijira_token', 'test-token');
      localStorage.setItem(
        'minijira_user',
        JSON.stringify({ id: userId, email: 'mete@example.test', displayName: 'Mete Tunçer' })
      );
    },
    { userId }
  );
  await page.route('**/hubs/**', (r) => r.fulfill({ status: 503, body: '' }));
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const method = req.method();
    const body = req.postDataJSON();
    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*'
        }
      });
      return;
    }
    calls.push({ method, path, body });
    let result: any;
    if (path.endsWith('/comments') || path.endsWith('/attachments')) result = [];
    else if (path.endsWith('/members'))
      result = [
        { id: 'm1', userId, email: 'mete@example.test', displayName: 'Mete Tunçer', role: 1 },
        { id: 'm2', userId: memberId, email: 'deniz@example.test', displayName: 'Deniz Kaya', role: 0 }
      ];
    else if (path.endsWith('/labels'))
      result = [
        { id: 'label-1', projectId, name: 'Backend', colorHex: '#aa83db' },
        { id: 'label-2', projectId, name: 'Frontend', colorHex: '#7fb8ad' }
      ];
    else if (path.includes('/sprints')) {
      if (method === 'GET') result = sprints;
      else if (path.endsWith('/start')) {
        sprints[0].status = 1;
        result = null;
      } else if (path.endsWith('/complete')) {
        sprints[0].status = 2;
        tasks = tasks.map((t) => (t.sprintId === sprintId && t.status !== 2 ? { ...t, sprintId: null } : t));
        result = null;
      } else if (method === 'POST') {
        result = {
          ...body,
          id: 'new-sprint',
          projectId,
          status: 0,
          taskCount: 0,
          doneCount: 0,
          totalPoints: 0,
          donePoints: 0
        };
        sprints.push(result);
      }
    } else if (path.endsWith('/tasks') && method === 'GET') result = tasks;
    else if (path.endsWith('/tasks') && method === 'POST') {
      result = { ...tasks[0], ...body, id: '99999999-0000-0000-0000-000000000000', status: 0, labelIds: [] };
      tasks.push(result);
    } else if (path.includes('/tasks/') && method === 'PUT') {
      const id = path.split('/').pop();
      tasks = tasks.map((t) => (t.id === id ? { ...t, ...body } : t));
      result = tasks.find((t) => t.id === id);
    } else if (path.endsWith('/move')) {
      const id = path.split('/').at(-2);
      tasks = tasks.map((t) => (t.id === id ? { ...t, ...body } : t));
      result = tasks.find((t) => t.id === id);
    } else
      result = {
        id: projectId,
        name: 'Mini Jira',
        description: 'Ekibin odağını koru, bir sonraki sürümü birlikte planla.',
        ownerId: userId,
        myRole: 1,
        createdAt: '2026-09-01T10:00:00Z'
      };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
      headers: { 'access-control-allow-origin': '*' }
    });
  });
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByRole('heading', { name: 'Kanban panosu' })).toBeVisible();
  await expect(page.locator('.task-card')).toHaveCount(15);
  return { calls };
}

test('views, filters, sorting and pagination', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  await page.screenshot({ path: 'test-results/kanban.png', fullPage: true });
  await page.getByRole('button', { name: 'Görev tablosu' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Sonraki →' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByLabel('Görev ara').fill('JWT');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('JWT yenileme');
  await page.getByRole('button', { name: 'Temizle', exact: true }).click();
  await page.getByRole('button', { name: 'Öncelik', exact: true }).click();
  await page.screenshot({ path: 'test-results/grid.png', fullPage: true });
  await page.getByRole('button', { name: 'Genel bakış' }).click();
  await expect(page.locator('.stat').first()).toContainText('15');
  await page.getByRole('button', { name: 'Ekip & etiketler' }).click();
  await expect(page.getByText('Deniz Kaya', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('create persists assignment and dates with only Task and Bug options', async ({ page }) => {
  const { calls } = await setup(page);
  await page.getByRole('button', { name: '+ Görev oluştur' }).click();
  await page.getByLabel('Başlık', { exact: true }).fill('Yeni entegrasyon görevi');
  await page.getByLabel('Atanan kişi', { exact: true }).selectOption({ label: 'Deniz Kaya' });
  await page.getByLabel('Sprint', { exact: true }).selectOption({ label: 'Sprint 1 — Temel deneyim' });
  await expect(page.getByLabel('Tür', { exact: true }).locator('option')).toHaveText(['Görev', 'Hata']);
  await expect(page.getByLabel('Story point', { exact: true })).toHaveCount(0);
  await page.getByLabel('Son tarih', { exact: true }).fill('2026-09-20');
  await page.getByRole('button', { name: 'Görevi oluştur', exact: true }).click();
  await expect(page.locator('.task-card')).toHaveCount(16);
  const request = calls.find((c) => c.method === 'POST' && c.path.endsWith('/tasks'));
  expect(request?.body).toMatchObject({
    title: 'Yeni entegrasyon görevi',
    assigneeId: memberId,
    sprintId,
    dueDate: '2026-09-20'
  });
});

test('unsaved dialog edits are discarded; saved assignment persists', async ({ page }) => {
  const { calls } = await setup(page);
  await page.getByRole('button', { name: names[0], exact: true }).click();
  await page.getByLabel('Görev başlığı').fill('Kaydedilmemiş başlık');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  await expect(page.getByRole('button', { name: names[0], exact: true })).toBeVisible();
  expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  await page.getByRole('button', { name: names[0], exact: true }).click();
  await page.getByLabel('Atanan kişi', { exact: true }).selectOption({ label: 'Deniz Kaya' });
  await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
  await expect(page.getByText('Değişiklikler kaydedildi.')).toBeVisible();
  expect(calls.find((c) => c.method === 'PUT')?.body.assigneeId).toBe(memberId);
  await page.screenshot({ path: 'test-results/task-detail.png', fullPage: true });
});

test('sprint lifecycle and unfinished work moves to backlog', async ({ page }) => {
  const { calls } = await setup(page);
  await page.getByRole('button', { name: 'Backlog & sprint' }).click();
  await page.getByRole('button', { name: 'Başlat', exact: true }).click();
  await expect(page.getByText('Aktif', { exact: true })).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Sprinti tamamla', exact: true }).click();
  await expect(page.locator('.sprint-panel').first().locator('.backlog-row')).toHaveCount(2);
  await expect(page.locator('.sprint-panel').last().locator('.backlog-row')).toHaveCount(13);
  expect(calls.some((c) => c.path.endsWith('/complete') && c.method === 'POST')).toBeTruthy();
  await page.screenshot({ path: 'test-results/backlog.png', fullPage: true });
});

test('bulk assignment and filtered CSV download', async ({ page }) => {
  const { calls } = await setup(page);
  await page.getByRole('button', { name: 'Görev tablosu' }).click();
  await page.getByLabel('Sayfadaki tüm görevleri seç').check();
  await page.getByLabel('Toplu işlem değeri').selectOption({ label: 'Deniz Kaya' });
  await page.getByRole('button', { name: 'Uygula', exact: true }).click();
  await expect(page.getByText('10 görev güncellendi.', { exact: true })).toBeVisible();
  expect(calls.filter((c) => c.method === 'PUT' && c.body.assigneeId === memberId)).toHaveLength(10);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '↓ CSV dışa aktar' }).click();
  expect((await download).suggestedFilename()).toBe('minijira-gorevler.csv');
});

test('mobile navigation stays inside viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Görev tablosu' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('failed inline assignment restores previous value and reports error', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Görev tablosu' }).click();
  await page.route('**/api/projects/*/tasks/*', async (route) => {
    if (route.request().method() === 'PUT')
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Görev yalnızca proje üyesine atanabilir.' })
      });
    else await route.fallback();
  });
  const select = page.getByLabel('MJ-00000005 atanan kişi', { exact: true });
  await expect(select).toContainText('Atanmamış');
  await select.selectOption({ label: 'Deniz Kaya' });
  await expect(page.getByRole('alert')).toContainText('Görev yalnızca proje üyesine atanabilir.');
  await expect(select.locator('option:checked')).toHaveText('Atanmamış');
});

test('hidden legacy fields survive an unrelated task edit', async ({ page }) => {
  const { calls } = await setup(page);
  await page.getByRole('button', { name: names[2], exact: true }).click();
  await expect(page.getByLabel('Görev türü').locator('option')).toHaveText(['Görev', 'Hata']);
  await expect(page.getByLabel('Story point', { exact: true })).toHaveCount(0);
  await page.getByLabel('Görev başlığı').fill('Güncel başlık');
  await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
  await expect(page.getByText('Değişiklikler kaydedildi.')).toBeVisible();
  const update = calls.find((call) => call.method === 'PUT');
  expect(update?.body).toMatchObject({ title: 'Güncel başlık', issueType: 2, storyPoints: 5 });
});

test('CSV excludes removed fields and escapes spreadsheet formulas', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: '+ Görev oluştur' }).click();
  await page.getByLabel('Başlık', { exact: true }).fill('=SUM(1,2)');
  await page.getByRole('button', { name: 'Görevi oluştur', exact: true }).click();
  await expect(page.locator('.task-card')).toHaveCount(16);
  await page.getByRole('button', { name: 'Görev tablosu' }).click();
  await expect(page.getByRole('button', { name: 'Puan', exact: true })).toHaveCount(0);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV dışa aktar' }).click();
  const download = await downloaded;
  const content = await readFile((await download.path())!, 'utf8');
  expect(content.charCodeAt(0)).toBe(0xfeff);
  expect(content.split('\r\n')[0]).not.toContain('Puan');
  expect(content).toContain('"\'=SUM(1,2)"');
});

test('bulk failure preserves remaining selection and completed updates', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Görev tablosu' }).click();
  await page.getByLabel('Sayfadaki tüm görevleri seç').check();
  let attempts = 0;
  await page.route('**/api/projects/*/tasks/*', async (route) => {
    if (route.request().method() === 'PUT' && ++attempts === 2) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test hatası' })
      });
    } else await route.fallback();
  });
  await page.getByRole('button', { name: 'Uygula', exact: true }).click();
  await expect(page.getByText('1/10 görev güncellendi. Kalan seçim korunuyor.')).toBeVisible();
  await expect(page.getByText('9 görev seçildi')).toBeVisible();
});

test('Kanban drag persists the new status and reloads the columns', async ({ page }) => {
  const { calls } = await setup(page);
  const handle = await page.locator('.column').first().locator('.drag-handle').first().boundingBox();
  const target = await page.locator('.drop-zone').nth(1).boundingBox();
  expect(handle).not.toBeNull();
  expect(target).not.toBeNull();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x + 15, handle!.y + 15, { steps: 5 });
  await page.mouse.move(target!.x + target!.width / 2, target!.y + 30, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => calls.filter((call) => call.method === 'PATCH').length).toBe(1);
  expect(calls.find((call) => call.method === 'PATCH')?.body.status).toBe(1);
  await expect(page.locator('.column').first().locator('.task-card')).toHaveCount(4);
  await expect(page.locator('.column').nth(1).locator('.task-card')).toHaveCount(6);
});
