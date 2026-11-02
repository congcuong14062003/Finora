# --- Giai đoạn 1: Build source code ---
FROM node:22-alpine AS builder

WORKDIR /app

# Cài đặt pnpm
RUN npm install -g pnpm

# Copy danh sách dependency trước để tận dụng Docker cache
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Cài đặt dependencies
RUN pnpm install --frozen-lockfile

# Copy toàn bộ mã nguồn và thực hiện build production
COPY . .
RUN pnpm build

# --- Giai đoạn 2: Serve bằng Nginx ---
FROM nginx:alpine AS runner

# Copy file cấu hình Nginx (xử lý routing cho SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy thư mục build từ builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

