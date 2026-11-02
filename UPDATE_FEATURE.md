# ROLE & OBJECTIVE
Bạn là Principal Frontend Architect & Product Engineer. Nhiệm vụ của bạn là nâng cấp toàn diện hệ thống quản lý tài chính cá nhân **Finora** (React 19, TypeScript, Vite, Zustand, React Hook Form + Zod, Tailwind CSS, Recharts, WebMCP) thành một **"Hệ điều hành Tài chính Cá nhân & Đầu tư Thông minh (AI-Powered Personal CFO)"**.

Dự án yêu cầu thực hiện **5 trụ cột nâng cấp lớn** với tiêu chí cốt lõi: **Tối đa hóa chiều sâu thống kê nhưng Tối thiểu hóa thao tác nhập liệu của người dùng (Zero-Friction UX)**.

---

# TRỤ CỘT 1: REFACTOR TOÀN DIỆN UI SANG MATERIAL UI (MUI v6/v7)
1. **Nghiêm cấm sử dụng các thẻ form HTML mặc định**: Loại bỏ 100% `<input>`, `<select>`, `<textarea>`, `<dialog>` gốc trên toàn bộ dự án.
2. **Hệ thống Component chuẩn MUI**:
   - Dùng `<TextField>`, `<Select>`, `<MenuItem>`, `<Autocomplete>` (hiển thị kèm Icon, Màu sắc, Số dư khả dụng) kết hợp với `Controller` của `react-hook-form`.
   - Dùng `<DatePicker>` (`@mui/x-date-pickers` + `dayjs`) cho mọi trường ngày tháng.
   - Dùng `<ToggleButtonGroup>` cho chuyển đổi Loại giao dịch (`Thu` / `Chi` / `Chuyển khoản` / `Đầu tư`) và Bộ lọc kỳ hạn.
   - Dùng `<Dialog>`, `<Drawer>`, `<Tabs>`, `<Tab>`, `<Accordion>`, `<Chip>`, `<Badge>`, `<Tooltip>`, `<Switch>`, `<Slider>` (cho công cụ giả lập tài chính).
   - Dùng `<Snackbar>` + `<Alert>` có nút hành động **`[Hoàn tác / Undo]`** cho mọi thao tác thêm/xóa/cân bằng số dư.
   - Đồng bộ `<ThemeProvider>` (Light/Dark mode) với bảng màu Tài chính cao cấp (Indigo, Emerald, Amber, Rose), bo góc `borderRadius: 12px`.

---

# TRỤ CỘT 2: CƠ CHẾ "ZERO-TOUCH" – ÍT THAO TÁC NHẤT CHO NGƯỜI LƯỜI

## 2.1. AI Command Bar & Multi-Intent Parser (1 Ô Nhập Cho Mọi Lệnh)
Đặt một thanh `<Autocomplete>` thông minh ở đỉnh trang chủ (`/`) và phím tắt `Ctrl + K`. Bộ phân tích cú pháp tiếng Việt (kết hợp WebMCP) tự động nhận diện **5 loại ý định (Intents)** chỉ từ 1 câu gõ:
1. **Chi tiêu/Thu nhập thường**: `"ăn trưa 45k"`, `"lương về 25tr"` -> Tự tạo giao dịch, tự gán danh mục & tài khoản.
2. **Đầu tư (Mã + Vốn)**: `"mua 100 cổ FPT giá 130tr"`, `"mua 2 chỉ vàng SJC 17tr"`, `"mua 0.02 BTC 45tr"` -> Tự động thêm vào Danh mục Tài sản Đầu tư (`InvestmentAsset`) và trừ tiền tài khoản nguồn.
3. **Thẻ tín dụng / Trả góp**: `"quẹt thẻ VCB mua tủ lạnh 12tr trả góp 6 tháng"` -> Ghi nhận vào thẻ tín dụng và tự chia lịch trả góp hàng tháng.
4. **Chia tiền nhóm (Split Bill)**: `"ăn lẩu 1200k chia 4 người"` -> Trừ tài khoản 1.2tr, ghi chi tiêu cá nhân 300k, tự đẩy 900k vào Sổ Nợ (`Debt` - Cho vay).
5. **Cập nhật số dư nhanh**: `"số dư ví tiền mặt còn 350k"` -> Tự động chạy lệnh cân bằng số dư (`Reconcile`).

## 2.2. Nút bấm 1-Chạm (One-Tap Quick Chips) & Gói Kinh Doanh (Business Bundles)
- **Quick Chips cá nhân**: Hàng nút `<Chip>` trên Dashboard (`☕ Cafe 35k`, `🛵 Gửi xe 5k`) bấm 1 chạm là lưu ngay.
- **Gói dòng tiền ổn định / Kinh doanh (Income/Expense Stream Templates)**:
  - Hỗ trợ người làm Freelance, Kinh doanh nhỏ, Cho thuê nhà: Tạo nút **"Ghi nhận Doanh thu/Lương 1-Click"**.
  - Ví dụ: Nhập `"Doanh thu bán hàng: 10.000.000đ"` -> Tự động tách thành giao dịch Thu `10tr` (Dòng tiền kinh doanh) và tự động trích `6tr` vào Chi phí giá vốn/vận hành theo tỷ lệ cấu hình sẵn.

## 2.3. Gợi ý mệnh giá VND & Cân bằng số dư 1-Click
- Mọi ô nhập tiền tự hiện `<Chip>` gợi ý mệnh giá (`45.000 ₫`, `450.000 ₫`, `4.500.000 ₫`) và hỗ trợ gõ phép tính (`30k + 15k`).
- Nút **"Cân bằng số dư thực tế"** tại `/accounts`: Chỉ cần nhập số tiền thực có trong ví/ngân hàng hiện tại, hệ thống tự sinh giao dịch bù trừ độ lệch vào mục *"Chi tiêu quên ghi"* trong 3 giây.
- **Chuỗi ngày ghi chép (Daily Streak 🔥)** trên Header kèm nút **"Hôm nay không tiêu gì (0đ)"**.

---

# TRỤ CỘT 3: QUẢN TRỊ RỦI RO, TÍN DỤNG, CẢNH BÁO & ĐIỀU PHỐI CHI TIÊU

## 3.1. Số dư Thực Được Tiêu (True Spendable Balance) & Ngày Cháy Túi
- Trên Dashboard (`/`), hiển thị nổi bật chỉ số **Số Dư Thực Được Tiêu**:
  `TrueBalance = Tổng tiền thanh khoản (Bank + Cash + E-Wallet) - (Hóa đơn định kỳ chưa trả trong tháng + Dư nợ thẻ tín dụng đến hạn + Khoản nợ phải trả trong tháng)`.
- Tính toán **Hạn mức an toàn hôm nay (`Daily Safe-to-Spend`)** và **Dự báo Ngày Cháy Túi (`Burn-Rate Exhaustion Date`)** dựa trên tốc độ tiêu trung bình 7 ngày qua.

## 3.2. Quản lý Thẻ Tín Dụng, Trả Góp & Cảnh báo Rủi ro Quá hạn (Credit & Risk Radar)
- Mở rộng loại tài khoản hoặc thêm module **Tín dụng (`/accounts` & `/debts`)**:
  - Hỗ trợ `credit_card` và `bnpl` (Ví trả sau): Cấu hình `creditLimit` (Hạn mức), `statementDay` (Ngày chốt sao kê, VD: ngày 20), `dueDay` (Ngày hạn thanh toán, VD: ngày 5), `interestRate` (Lãi phạt quá hạn).
- **Hệ thống Cảnh báo Rủi ro Đa tầng (Risk Alert Engine)**:
  - 🔴 **Nguy cấp (Critical)**: Khoản vay / Sao kê thẻ tín dụng còn `<= 3 ngày` là đến hạn hoặc số dư thanh khoản hiện tại nhỏ hơn tổng nợ phải trả trong 7 ngày tới (Nguy cơ vỡ nợ / phạt lãi).
  - 🟡 **Cảnh báo (Warning)**: Danh mục chi tiêu vượt 80% ngân sách khi chưa đi hết 50% số ngày trong tháng; Phát hiện "Lạm phát lối sống" (Chi tiêu ăn chơi tăng nhanh hơn thu nhập).
- **Gợi ý Quản lý & Tự động Điều phối 1-Click (Smart Budget Rebalancer)**:
  - Khi 1 ngân sách bị vượt (VD: *Ăn uống vượt 400k*), hệ thống tự tìm danh mục khác đang dư nhiều (VD: *Mua sắm còn dư 1.2tr*) và hiện nút **`[Bù 400k từ Mua sắm sang Ăn uống]`** để người dùng cân đối lại chỉ bằng 1 cú click.

---

# TRỤ CỘT 4: THỐNG KÊ TÀI SẢN, ĐẦU TƯ (VÀNG/CHỨNG/COIN) & THU NHẬP THỤ ĐỘNG (PRO)

## 4.1. Danh mục Đầu tư & Tài sản Đa lớp (Investment & Asset Portfolio - `/assets` hoặc trong `/accounts`)
Bổ sung thực thể `InvestmentAsset` cho phép theo dõi tài sản sinh lời chỉ bằng cách nhập **Mã (Ticker) + Số lượng + Tổng vốn gốc**:
- **Các nhóm tài sản hỗ trợ**:
  1. **Chứng khoán / Quỹ ETF (`stock`)**: Nhập mã (VD: `FPT`, `VCB`, `HPG`, `E1VFVN30`), số lượng cổ phiếu, tổng vốn bỏ ra.
  2. **Vàng (`gold`)**: Nhập loại (`SJC`, `Nhẫn 9999`), số lượng (Chỉ/Lượng), giá vốn mua vào.
  3. **Tài sản số (`crypto`)**: Nhập mã (`BTC`, `ETH`, `SOL`, `USDT`), số lượng, vốn gốc.
  4. **Tiết kiệm gửi góp / Bất động sản / Khác (`savings_deposit` | `real_estate`)**: Nhập vốn gốc và lãi suất `%/năm` (tự động cộng dồn lãi tích lũy mỗi ngày).
- **Cơ chế Tự động Định giá & Thống kê Lãi/Lỗ (PnL)**:
  - Tích hợp bảng giá tham chiếu tự động (cập nhật giá thị trường hoặc cho phép bấm *"Cập nhật giá thị trường 1-Click"*).
  - Tự động tính: `Giá trị hiện tại = Số lượng * Giá thị trường`, `Lãi/Lỗ (PnL) = Giá trị hiện tại - Vốn gốc` (hiển thị số tiền và `%` tăng/giảm bằng `<Chip color="success | error">`).
  - Biểu đồ phân bổ cấu trúc Tài sản (Tiền mặt vs Vàng vs Cổ phiếu vs Crypto vs Nợ) và cập nhật thẳng vào **Tài sản ròng (Net Worth)**.

## 4.2. Theo dõi Dòng tiền Thu nhập (Chủ động vs Thụ động vs Kinh doanh)
- Mở rộng `Category` và `Transaction` thêm thuộc tính `incomeSourceType?: 'active' | 'passive' | 'business' | 'investment_yield'`:
  - **Thu nhập Chủ động (`active`)**: Lương cứng, thưởng, làm thêm.
  - **Thu nhập Kinh doanh (`business`)**: Doanh thu bán hàng, dự án freelance.
  - **Thu nhập Thụ động (`passive` / `investment_yield`)**: Tiền cho thuê nhà, Cổ tức chứng khoán, Lãi tiết kiệm, Affiliate.
- **Thước đo Tự Do Tài Chính (Financial Freedom Progress)**:
  - Tính tỷ lệ: `Tỷ lệ Tự do (%) = (Tổng Thu nhập Thụ động hàng tháng / Tổng Chi tiêu Thiết yếu hàng tháng) * 100`.
  - Tính **Freedom Runway**: Số tháng sống sót nếu hôm nay ngừng làm việc dựa trên Tổng tài sản thanh khoản + đầu tư.

---

# TRỤ CỘT 5: NÂNG CẤP AI WEBMCP & HỆ THỐNG TRẢ PHÍ (FINORA PRO 👑)

## 5.1. Mở rộng WebMCP (`src/lib/webmcp.ts`) & Trợ lý AI Phân tích
Đăng ký bộ công cụ đầy đủ vào `document.modelContext` (và cung cấp giao diện AI Assistant Drawer ngay trên web để người dùng bấm dùng trực tiếp):
1. `get_finance_summary`: Trả về bức tranh toàn cảnh (Thu, Chi, True Spendable Balance, Rủi ro quá hạn, Tỷ lệ thu nhập thụ động, PnL đầu tư).
2. `create_transaction`: Tạo giao dịch thu/chi/chuyển khoản.
3. `smart_command_execute`: Nhận chuỗi câu lệnh tự nhiên tiếng Việt (như ở mục 2.1) và tự động điều phối thêm vào Giao dịch, Khoản vay, Thẻ tín dụng hoặc Mã đầu tư.
4. `add_or_update_investment`: Thêm mã chứng khoán/vàng/coin kèm số vốn gốc và số lượng vào danh mục tài sản.
5. `analyze_financial_risks`: Quét toàn bộ hệ thống và trả về danh sách các rủi ro quá hạn thẻ tín dụng, danh mục lạm chi và đề xuất hành động tối ưu.

## 5.2. Phân quyền Gói cước (Free vs Finora Pro 👑) & Paywall
- Cập nhật `User`: `plan: 'free' | 'pro'`.
- **Gói FREE**: Quản lý thu chi cơ bản, tối đa 2 tài khoản, 3 ngân sách, Quick Chips cơ bản, Cân bằng số dư.
- **Gói FINORA PRO (49.000đ/tháng hoặc 399.000đ/năm)**:
  - Mở khóa **Quản lý Danh mục Đầu tư theo Mã (Chứng khoán, Vàng, Coin)** & Tự động tính PnL.
  - Mở khóa **AI Command Bar không giới hạn** & **Dán tin nhắn biến động số dư ngân hàng (Bank SMS Paste)**.
  - Mở khóa **Cảnh báo Rủi ro Tín dụng/Quá hạn**, **Chia tiền nhóm (Split Bill)**, **Phân tích Thu nhập Thụ động & Tự do tài chính**.
  - Mở khóa **Giả lập mua sắm trả góp (What-If Simulator)** và tự động chạy giao dịch định kỳ (`Auto-Execute`).
- Xây dựng `<PricingDialog>` bằng MUI với bảng so sánh quyền lợi, mã QR thanh toán demo và nút **"Kích hoạt Pro ngay (Demo Mode)"** + nút chuyển đổi nhanh `Free <-> Pro` trên Header/Settings để dễ dàng kiểm thử.

---

# CẬP NHẬT KIẾN TRÚC DỮ LIỆU (`src/types/finance.ts`)
Hãy mở rộng các interface hiện tại (đảm bảo có giá trị mặc định an toàn khi load từ `localStorage` cũ):
- `User`: thêm `plan: 'free' | 'pro'`, `streakCount: number`, `lastCheckInDate: string`, `defaultAccountId?: string`.
- `Account`: mở rộng `type` thêm `'credit_card'`, thêm `creditLimit?: number`, `statementDay?: number`, `dueDay?: number`.
- `Category`: thêm `incomeKind?: 'active' | 'business' | 'passive'`, `isEssential?: boolean` (chi tiêu thiết yếu hay không thiết yếu).
- `InvestmentAsset` (Mới): `{ id, symbol, name, assetClass: 'stock' | 'gold' | 'crypto' | 'savings' | 'real_estate', quantity, totalCostBasis, currentUnitPrice, annualYieldRate?, accountId?, updatedAt }`.
- `QuickTemplate` (Mới): `{ id, label, amount, type, categoryId, accountId, icon, isBusinessBundle?, costRatio? }`.

---

# KẾ HOẠCH THỰC THI (STEP-BY-STEP EXECUTION)
1. **Bước 1 (Core & MUI Setup)**: Cài đặt `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/x-date-pickers`, `dayjs`. Tạo `ThemeProvider` và các wrapper component chuẩn MUI cho Form.
2. **Bước 2 (Data Layer & Engines)**: Nâng cấp `src/types/finance.ts`, `financeService.ts` và Zustand Store. Viết bộ `nlpParser.ts` (bóc tách câu lệnh tiếng Việt cho cả thu chi, mua vàng/cổ phiếu, quẹt thẻ, chia tiền) và bộ `riskAndInsightEngine.ts` (tính True Balance, Cảnh báo quá hạn, Thu nhập thụ động, PnL đầu tư).
3. **Bước 3 (UI Refactor & Habit Features)**: Refactor toàn bộ các trang hiện tại sang MUI. Đưa **AI Command Bar**, **Quick Chips**, **True Spendable Balance**, **Cảnh báo Rủi ro & Gợi ý điều phối 1-Click** lên trang Tổng quan (`/`).
4. **Bước 4 (Investment, Credit & Passive Income)**: Xây dựng giao diện Quản lý Tài sản Đầu tư (thêm mã Chứng khoán/Vàng/Coin + số tiền gốc, bảng PnL), Quản lý Thẻ tín dụng/Rủi ro quá hạn và Thống kê Thu nhập Thụ động / Kinh doanh.
5. **Bước 5 (WebMCP, Pro Paywall & Tests)**: Cập nhật `src/lib/webmcp.ts`, hoàn thiện `<PricingDialog>` (Finora Pro) và viết đầy đủ Unit Tests (`Vitest`) cho các thuật toán tính toán mới. Đảm bảo `pnpm test` và `pnpm build` thành công 100%.