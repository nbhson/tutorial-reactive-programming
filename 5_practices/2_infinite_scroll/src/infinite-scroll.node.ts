/**
 * infinite-scroll.node.ts — Mô phỏng infinite scroll KHÔNG cần browser.
 *
 * Chạy:
 *   npx ts-node src/infinite-scroll.node.ts
 *
 * "Scroll tới đáy" được mô phỏng bằng một Subject — mỗi lần next()
 * tương đương người dùng cuộn tới gần đáy trang.
 */
import { Subject, from } from 'rxjs';
import {
  concatMap, scan, takeWhile, map, finalize, tap, filter,
} from 'rxjs';

/* ── Types ──────────────────────────────────────────────────────── */

interface Item {
  id: number;
  text: string;
}

/* ── Mock API: mỗi trang PAGE_SIZE items; trang cuối ít hơn PAGE_SIZE ─ */

const PAGE_SIZE = 3;
const TOTAL_ITEMS = 10; // → 4 trang: 3 + 3 + 3 + 1

function fakeApiPage(p: number) {
  const start = p * PAGE_SIZE;
  const remaining = Math.max(0, TOTAL_ITEMS - start);
  const count = Math.min(PAGE_SIZE, remaining);
  const items = Array.from({ length: count }, (_, i) => ({
    id: start + i,
    text: `Item #${start + i}`,
  }));
  // giả lập độ trễ mạng 400ms
  return new Promise<Item[]>((resolve) => setTimeout(() => resolve(items), 400));
}

/* ── Infinite scroll pipeline (giống README) ───────────────────── */

const scrollBottom$ = new Subject<void>();
let page = 0;
let loading = false;

const subscription = scrollBottom$
  .pipe(
    filter(() => !loading), // đang tải → bỏ qua lần cuộn này
    tap(() => (loading = true)),
    concatMap(() => {
      const current = page++;
      return from(fakeApiPage(current)).pipe(
        map((items) => ({ items, isLast: items.length < PAGE_SIZE })),
        finalize(() => (loading = false))
      );
    }),
    takeWhile(({ isLast }) => !isLast, true), // vẫn phát trang cuối rồi mới dừng
    scan((all: Item[], { items }) => [...all, ...items], []),
    tap((all) => {
      console.log(
        `📦 Đã tải ${all.length}/${TOTAL_ITEMS} items [${all
          .map((i) => i.id)
          .join(', ')}]`
      );
    })
  )
  .subscribe({
    complete: () =>
      console.log(
        '✅ Hết dữ liệu — stream complete. Các lần "cuộn" sau này không còn tác dụng.'
      ),
    error: (err) => console.error('Lỗi:', err),
  });

/* ── Mô phỏng người dùng cuộn 10 lần (nhiều hơn số trang có sẵn) ── */

for (let i = 0; i < 10; i++) {
  setTimeout(() => {
    console.log(`[scroll #${i + 1}]`);
    scrollBottom$.next();
  }, i * 500);
}

// Sau 8s: chứng minh sau khi complete, scroll không còn tác dụng
setTimeout(() => {
  console.log(
    `[sau complete] subscription.closed = ${subscription.closed} → next() không tác dụng`
  );
  if (!subscription.closed) scrollBottom$.next();
  setTimeout(() => process.exit(0), 1000);
}, 8000);
