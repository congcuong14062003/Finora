# Finora AI Agents & Skills Guide

Tài liệu này tổng hợp danh mục các **AI Skills**, cấu trúc kỹ năng, kiến trúc **Subagents**, cùng hướng dẫn tích hợp và mở rộng AI trong hệ thống quản lý tài chính **Finora**.

---

## 1. Tổng quan về AI Skills trong Finora

Trong hệ sinh thái Finora và môi trường phát triển AI-assisted (như Antigravity / Agentic Coding), **AI Skills** là các gói hướng dẫn chuyên biệt (instructions, workflows, scripts, và schemas) giúp AI Agent thực hiện chính xác các nhiệm vụ phức tạp:
- **Tự động hóa tài chính**: Đồng bộ số dư, phân loại giao dịch thông minh, nhắc nợ.
- **Tương tác trực tiếp qua WebMCP**: Cho phép Agent trong trình duyệt truy vấn dữ liệu và thực hiện giao dịch thông qua giao thức chuẩn **Model Context Protocol (MCP)**.
- **Tối ưu hóa mã nguồn & Kiểm thử**: Chạy test nghiệp vụ kế toán, tái cấu trúc UI/UX và mở rộng tính năng.

---

## 2. Tiêu chuẩn cấu trúc một AI Skill

Mỗi AI Skill được tổ chức dưới dạng một thư mục độc lập với cấu trúc chuẩn:

```
skills/<skill-name>/
├── SKILL.md             # Tệp chỉ dẫn cốt lõi (bắt buộc, chứa YAML frontmatter)
├── scripts/             # Các script bổ trợ thực thi tự động (Node.js, Bash, Python)
├── examples/            # Dữ liệu mẫu, ví dụ prompt hoặc kết quả mong muốn
└── references/          # Tài liệu đặc tả kỹ thuật, schema, hoặc API docs
```

### Cấu trúc tệp `SKILL.md`:
```yaml
---
name: "ten-ky-nang"
description: "Mô tả ngắn gọn chức năng của skill và trường hợp nên kích hoạt"
---

# Hướng dẫn chi tiết
...
```

---

## 3. Danh mục AI Skills cốt lõi

### 3.1. Nhóm Kỹ năng Nghiệp vụ Tài chính (Finora Domain Skills)

| Tên Skill | Mục đích | Cách kích hoạt & Ứng dụng |
| :--- | :--- | :--- |
| **`finora-webmcp`** | Giao tiếp 2 chiều với Finora Web qua API `document.modelContext`. Cho phép AI đọc số dư hiện tại và tạo giao dịch tự động. | Kích hoạt khi Agent chạy trên browser có hỗ trợ WebMCP: gọi `get_finance_summary` và `create_transaction`. |
| **`financial-analytics`** | Phân tích thu nhập, chi phí, tốc độ tiết kiệm (Savings Rate), cảnh báo vượt ngân sách danh mục và xu hướng tài sản ròng. | Kích hoạt khi người dùng yêu cầu báo cáo tài chính định kỳ hoặc đề xuất cắt giảm chi tiêu. |
| **`finance-qa-tester`** | Chạy Vitest kiểm định các quy tắc bảo toàn tiền tệ (chuyển khoản nội bộ không đổi tổng tài sản, nợ không tính vào chi tiêu tiêu dùng). | Dùng trong quy trình CI/CD hoặc trước khi build production: `pnpm test`. |

### 3.2. Nhóm Kỹ năng Hệ sinh thái & Nền tảng (Platform & Customization Skills)

| Tên Skill | Mô tả | Ứng dụng thực tế |
| :--- | :--- | :--- |
| **`generative_ui`** | Kết xuất các widget HTML/React tương tác, biểu đồ tài chính động trực tiếp trong cuộc hội thoại. | Dựng biểu đồ dòng tiền (Cashflow Waterfall), bảng kế hoạch trả nợ tương tác. |
| **`automation`** | Thiết kế các tác vụ nền theo lịch trình (cron-job / scheduled triggers). | Lên lịch nhắc nhở thanh toán nợ đến hạn, tổng hợp chi tiêu vào ngày 1 hàng tháng. |
| **`agy-customizations`** | Hướng dẫn định nghĩa Rules, Skills, Hooks và MCP Servers mở rộng cho workspace. | Tùy biến workspace Antigravity theo phong cách lập trình riêng của dự án. |
| **`plugin`** | Đóng gói toàn bộ skills, hooks, agents thành một Plugin chuẩn để phân phối. | Đóng gói Finora Tool Suite thành plugin có thể cài đặt cho các workspace khác. |
| **`antigravity-guide`** | Hướng dẫn tra cứu CLI (`agy`), phím tắt, slash commands và cấu hình hệ thống. | Hỗ trợ lập trình viên khi tích hợp sâu với Antigravity Engine. |

---

## 4. Tích hợp WebMCP: Cầu nối AI Agent với Finora Web

Finora được nhúng sẵn **WebMCP Tools** tại `src/lib/webmcp.ts`. Khi mở website trên trình duyệt tương thích Model Context, AI Agent có thể gọi trực tiếp 2 công cụ:

### Tool 1: `get_finance_summary`
- **Mục đích**: Đọc tổng thu nhập, tổng chi tiêu đã hoàn tất và số lượng tài khoản trong sổ.
- **Quyền hạn**: Read-only (`readOnlyHint: true`).
- **Dữ liệu trả về**:
  ```json
  {
    "income": 35000000,
    "expense": 18200000,
    "accountCount": 4
  }
  ```

### Tool 2: `create_transaction`
- **Mục đích**: Tạo nhanh giao dịch thu/chi vào hệ thống kèm cập nhật ngay lập tức giao diện.
- **Input Schema**:
  ```json
  {
    "name": "Tiền thưởng dự án",
    "amount": 5000000,
    "type": "income",
    "categoryId": "cat-income-bonus",
    "accountId": "acc-bank-vcb",
    "date": "2026-11-02",
    "note": "AI Assistant ghi nhận tự động"
  }
  ```

---

## 5. Danh mục Subagents chuyên biệt (Specialized Subagents)

Để giải quyết các bài toán lớn mà không làm quá tải ngữ cảnh hội thoại, hệ thống phân chia các subagent chuyên trách:

1. **Finora Analyst Agent**
   - **Vai trò**: Phân tích danh mục chi tiêu, đối chiếu ngân sách tháng, dự báo dòng tiền 3–6 tháng tới.
   - **Công cụ**: WebMCP Reader, Data Analysis Tools.

2. **Codebase & Architecture Agent**
   - **Vai trò**: Kiểm soát chất lượng mã nguồn TypeScript/React, đảm bảo tính toàn vẹn của state trong Zustand và adapter Storage.
   - **Công cụ**: File editor, terminal test runner, linter.

3. **Research Agent**
   - **Vai trò**: Nghiên cứu các chuẩn định dạng xuất nhập khẩu sao kê ngân hàng (CSV/OFX/QIF) tại Việt Nam, tối ưu trải nghiệm nhập liệu tự động.
   - **Chế độ**: Read-only Sandbox.

---

## 6. Lệnh tắt nhanh (Slash Commands) hữu ích

Người dùng có thể kích hoạt nhanh các chế độ làm việc của Agent thông qua các Slash Commands:

- `/plan`: Lập kế hoạch chi tiết từng bước trước khi can thiệp vào các logic tính toán tài chính quan trọng.
- `/goal`: Chạy tác vụ dài hơi độc lập (ví dụ: refactor toàn bộ service layer sang REST API thật).
- `/schedule`: Đặt lịch kiểm tra định kỳ hoặc chạy script tự động.
- `/browser`: Ủy quyền cho Agent mở trình duyệt để kiểm thử tương tác UI hoặc kiểm tra WebMCP.
- `/grill-me`: Phỏng vấn người dùng để làm rõ yêu cầu nghiệp vụ trước khi thiết kế tính năng mới.
- `/boost`: Chế độ tư duy đa chiều, phản biện sâu cho các bài toán kiến trúc dữ liệu phức tạp.

---

## 7. Quy trình tạo mới một AI Skill cho dự án

1. Tạo thư mục kỹ năng tại `.gemini/antigravity/skills/<skill-name>/` (hoặc trong thư mục cấu hình cá nhân).
2. Viết file `SKILL.md` với phần frontmatter khai báo rõ ràng điều kiện kích hoạt.
3. Cung cấp các kịch bản mẫu và các hàm xử lý dữ liệu kiểm thử.
4. Kiểm thử skill bằng cách gọi lệnh prompt liên quan đến nghiệp vụ đã khai báo.

