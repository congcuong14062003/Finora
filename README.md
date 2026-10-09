# Finora – Personal Finance Manager

Finora là website quản lý tài chính cá nhân dùng React, TypeScript, Vite và Tailwind CSS. Bản đầu hoạt động bằng dữ liệu mẫu lưu trên trình duyệt; chưa có backend hay xác thực tài khoản thật.

## Chạy dự án

Cần Node.js 20.19+ và pnpm 10+.

```bash
pnpm install
pnpm dev
```

Mở URL Vite in trong terminal (thường là `http://localhost:5173`). Kiểm tra nghiệp vụ bằng `pnpm test`; tạo bản production bằng `pnpm build`.

Nếu muốn bắt đầu lại, vào **Cài đặt → Khôi phục dữ liệu mẫu**. Dữ liệu demo được lưu trong `localStorage` trên thiết bị hiện tại. Mật khẩu nhập trong màn hình auth demo không được lưu.

## Cấu trúc và các giai đoạn

| Giai đoạn | Tệp chính | Đã hoàn thành |
| --- | --- | --- |
| 1. Nền tảng | `package.json`, `vite.config.ts`, `tailwind.config.js`, `src/main.tsx`, `src/components/Layout.tsx`, `src/styles.css` | React/TS/Vite, Tailwind, route, sidebar, header, theme sáng/tối, responsive |
| 2. Tổng quan | `src/features/dashboard/Dashboard.tsx`, `src/mocks/data.ts`, `src/lib/finance.ts` | 6 chỉ số, bộ lọc thời gian, biểu đồ thu chi, danh mục, dòng tiền, tài sản ròng, ngân sách, mục tiêu, nhắc nhở |
| 3. Giao dịch & tài khoản | `src/features/transactions/Transactions.tsx`, `src/features/accounts/Accounts.tsx`, `src/features/categories/Categories.tsx` | CRUD giao dịch, lọc/tìm/sắp xếp/phân trang/CSV, tài khoản, chuyển tiền nội bộ, danh mục |
| 4. Kế hoạch | `src/features/budgets/Budgets.tsx`, `src/features/savings/Savings.tsx`, `src/features/debts/Debts.tsx` | Ngân sách thực chi, đóng góp mục tiêu, thanh toán dư nợ |
| 5. Báo cáo & cài đặt | `src/features/reports/Reports.tsx`, `src/features/recurring/Recurring.tsx`, `src/features/settings/Settings.tsx`, `src/features/auth/Auth.tsx` | Báo cáo/CSV, lịch định kỳ, cấu hình cơ bản, giao diện auth demo |
| 6. Trạng thái giao diện | `src/components/ui.tsx`, `src/styles.css`, `src/store.ts` | Modal, xác nhận xóa, toast, skeleton, empty/error state, animation nhẹ |
| 7. Kiểm tra | `src/lib/finance.test.ts` | Test các quy tắc tính tiền; TypeScript và build production |

## Quy tắc dữ liệu

- Mọi số tiền là số nguyên VND. Tài khoản có số dư đầu kỳ và số dư hiện tại được tính từ giao dịch **đã hoàn tất**.
- Chuyển khoản nội bộ ghi một bản ghi có tài khoản gửi và nhận; số dư hai tài khoản đổi tương ứng, tổng thu/chi không đổi.
- Đóng góp mục tiêu từ tài khoản khác tạo chuyển khoản nội bộ. Đóng góp từ chính tài khoản mục tiêu chỉ đánh dấu khoản tiền đã dành, không thay đổi số dư.
- Trả hoặc thu hồi nợ tạo dòng tiền loại chuyển khoản với đối tác bên ngoài, giảm dư nợ và điều chỉnh số dư tài khoản nhưng không cộng vào thu nhập hoặc chi tiêu tiêu dùng.
- Dashboard, tài khoản, ngân sách và báo cáo dùng cùng nguồn `FinanceData` và các hàm trong `src/lib/finance.ts`.
- `src/services/financeService.ts` là lớp truy cập dữ liệu; có thể thay adapter mock bằng REST API khi triển khai backend.

## Giới hạn của bản demo

Màn hình đăng nhập, đăng ký và đặt lại mật khẩu chỉ trình diễn luồng giao diện. Không có email, JWT hoặc bảo vệ dữ liệu phía máy chủ. Giao dịch định kỳ chỉ phát sinh khi người dùng bấm **Ghi nhận kỳ này**. Số dư đầu kỳ và các khoản nợ mẫu là giả định tại thời điểm bắt đầu sổ; không có giao dịch lịch sử trước thời điểm đó.
