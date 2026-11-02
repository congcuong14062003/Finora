import { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Paper,
  InputBase,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Bot,
  X,
  Send,
  ShieldAlert,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useFinance } from '../store';
import { parseVietnameseCommand } from '../lib/nlpParser';
import { money } from '../lib/finance';
import {
  calculateTrueSpendableBalance,
  analyzeFinancialRisks,
  calculateInvestmentSummary
} from '../lib/riskAndInsightEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  data?: any;
  timestamp: string;
}

export function AiAssistantDrawer({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data, update } = useFinance();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Xin chào! Tôi là Trợ lý Tài chính AI Tích Lộc (WebMCP Copilot). Bạn có thể yêu cầu tôi kiểm tra rủi ro, phân tích dòng tiền, hoặc gõ nhanh lệnh chi tiêu, mua vàng/cổ phiếu, quẹt thẻ trả góp hay chia tiền.',
      timestamp: '18:00'
    }
  ]);

  if (!data) return null;

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      // 1. Check if user asked for Finance Summary
      if (textToSend.toLowerCase().includes('tổng quan') || textToSend.toLowerCase().includes('summary')) {
        const trueSpendable = calculateTrueSpendableBalance(data);
        const inv = calculateInvestmentSummary(data.investments || []);
        const responseText = `**TỔNG QUAN TÀI CHÍNH HIỆN TẠI**:\n- **Số dư thực được tiêu**: ${money(trueSpendable.trueBalance)}\n- **Hạn mức an toàn hôm nay**: ${money(trueSpendable.dailySafeToSpend)} / ngày\n- **Dự báo ngày cháy túi**: Còn khoảng ${trueSpendable.burnRateDaysLeft} ngày\n- **Danh mục đầu tư**: ${inv.assetsWithPnL.length} mã (Tổng giá trị: ${money(inv.totalCurrentValue)}, Lãi/lỗ: ${money(inv.totalPnL)})`;

        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: responseText,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setLoading(false);
        return;
      }

      // 2. Check if user asked for Risk Analysis
      if (textToSend.toLowerCase().includes('rủi ro') || textToSend.toLowerCase().includes('nguy cơ') || textToSend.toLowerCase().includes('risk')) {
        const risks = analyzeFinancialRisks(data);
        let responseText = '';
        if (risks.length === 0) {
          responseText = '**AN TOÀN**: Hệ thống không phát hiện rủi ro quá hạn thẻ tín dụng hay lạm chi nào trong tháng này!';
        } else {
          responseText = `**PHÂN TÍCH RỦI RO (${risks.length} cảnh báo)**:\n` + risks.map(r => `• [${r.level.toUpperCase()}]: ${r.title}\n  ${r.description}`).join('\n\n');
        }

        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: responseText,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setLoading(false);
        return;
      }

      // 3. Otherwise, parse as Smart Command
      const parsed = parseVietnameseCommand(textToSend, data.categories, data.accounts, data.user.defaultAccountId);

      if (!parsed) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: 'Tôi chưa hiểu rõ câu lệnh. Bạn có thể thử:\n- "ăn trưa 45k"\n- "mua 100 cổ FPT 13.8tr"\n- "quẹt thẻ VCB 12tr góp 6 tháng"\n- "ăn lẩu 1200k chia 4 người"\n- "số dư ví tiền mặt còn 350k"',
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setLoading(false);
        return;
      }

      // Execute through smart parser
      if (parsed.intent === 'transaction' && parsed.transaction) {
        const tx = parsed.transaction;
        await update(d => ({
          ...d,
          transactions: [
            {
              id: `tx-ai-${Date.now()}`,
              name: tx.name,
              amount: tx.amount,
              type: tx.type,
              categoryId: tx.categoryId,
              accountId: tx.accountId,
              date: tx.date,
              method: 'WebMCP AI Copilot',
              note: 'Tạo tự động: ' + parsed.raw,
              status: 'completed'
            },
            ...d.transactions
          ]
        }));
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: `**ĐÃ XỬ LÝ Ý ĐỊNH: ${parsed.badgeLabel}**\n\n${parsed.explanation}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: `Đã xảy ra lỗi: ${err?.message || 'Không thể thực thi lệnh'}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 400 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'var(--bg-surface)'
          }
        }
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: 'var(--brand-primary-tint)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bot size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Tích Lộc AI Copilot
            </Typography>
            <Chip
              label="WebMCP Active"
              size="small"
              color="success"
              sx={{ height: 16, fontSize: 9.5, fontWeight: 800 }}
            />
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </Box>

      {/* Quick Action Chips */}
      <Box sx={{ p: 1.5, display: 'flex', gap: 0.75, flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', bgcolor: 'var(--bg-subtle)' }}>
        <Chip
          icon={<BarChart3 size={12} />}
          label="Tổng quan"
          size="small"
          onClick={() => handleSend('Báo cáo tổng quan')}
          clickable
          sx={{ fontSize: 11, fontWeight: 700 }}
        />
        <Chip
          icon={<ShieldAlert size={12} />}
          label="Quét rủi ro"
          size="small"
          onClick={() => handleSend('Phân tích rủi ro tài chính')}
          clickable
          sx={{ fontSize: 11, fontWeight: 700 }}
        />
        <Chip
          icon={<TrendingUp size={12} />}
          label="Mua 100 cổ FPT"
          size="small"
          onClick={() => handleSend('mua 100 cổ FPT 13.8tr')}
          clickable
          sx={{ fontSize: 11, fontWeight: 700 }}
        />
      </Box>

      {/* Message Chat Feed */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {messages.map(m => (
          <Box
            key={m.id}
            sx={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: m.sender === 'user' ? 'primary.main' : 'var(--bg-subtle)',
                color: m.sender === 'user' ? '#fff' : 'text.primary',
                border: m.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}
            >
              {m.text}
            </Paper>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'var(--text-muted)', px: 0.5, mt: 0.25, display: 'block', textAlign: m.sender === 'user' ? 'right' : 'left' }}>
              {m.timestamp}
            </Typography>
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Đang phân tích & thực thi qua WebMCP...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Input Field */}
      <Box
        component="form"
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        sx={{
          p: 1.5,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            border: '1px solid var(--border-subtle)',
            bgcolor: 'var(--bg-subtle)'
          }}
        >
          <InputBase
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Hỏi AI hoặc nhập lệnh..."
            fullWidth
            sx={{ fontSize: 13 }}
          />
        </Paper>
        <IconButton color="primary" type="submit" disabled={!input.trim() || loading} size="small">
          <Send size={16} />
        </IconButton>
      </Box>
    </Drawer>
  );
}
