import {format,subDays} from 'date-fns';
import type {FinanceData,Transaction,QuickTemplate} from '../types';

const today=new Date();
const day=(n:number)=>format(subDays(today,n),'yyyy-MM-dd');
const month=format(today,'yyyy-MM');

const expenseNames=[
  ['Ăn trưa cùng đồng nghiệp','food',185000],
  ['Cà phê cuối tuần','food',89000],
  ['Siêu thị cuối tuần','food',620000],
  ['Grab đi làm','transport',92000],
  ['Tiền thuê nhà','housing',6500000],
  ['Mua đồ gia dụng','shopping',780000],
  ['Xem phim','entertainment',195000],
  ['Khám sức khỏe','health',450000],
  ['Khóa học trực tuyến','education',890000],
  ['Hóa đơn điện nước','bills',1240000],
  ['Vé máy bay','travel',1750000],
  ['Đăng ký ứng dụng','other',139000]
] as const;

const transactions:Transaction[]=[];
for(let i=0;i<45;i++){
  const e=expenseNames[i%expenseNames.length];
  transactions.push({
    id:`tx-${i+1}`,
    name:e[0],
    amount:e[2]+(i%4)*23000,
    type:'expense',
    categoryId:e[1],
    accountId:i%5===0?'wallet':'bank',
    date:day(i*2),
    method:i%5===0?'Ví điện tử':'Chuyển khoản',
    note:i%7===0?'Chi tiêu sinh hoạt':'',
    status:'completed'
  });
  if(i%4===0) {
    transactions.push({
      id:`inc-${i}`,
      name:i%15===0?'Lương tháng':'Thu nhập làm thêm',
      amount:i%15===0?28500000:1800000,
      type:'income',
      categoryId:i%15===0?'salary':'freelance',
      accountId:'bank',
      date:day(i*2+1),
      method:'Chuyển khoản',
      note:'',
      status:'completed'
    });
  }
}

transactions.push({
  id:'transfer-seed',
  name:'Chuyển vào quỹ dự phòng',
  amount:3000000,
  type:'transfer',
  accountId:'bank',
  toAccountId:'saving',
  date:day(12),
  method:'Chuyển khoản',
  note:'Chuyển nội bộ',
  status:'completed'
});

const defaultQuickTemplates: QuickTemplate[] = [
  { id: 'qt-1', label: '☕ Cafe 30k', name: 'Cà phê sáng', amount: 30000, type: 'expense', categoryId: 'food', accountId: 'wallet' },
  { id: 'qt-2', label: '🛵 Gửi xe 5k', name: 'Vé gửi xe', amount: 5000, type: 'expense', categoryId: 'transport', accountId: 'cash' },
  { id: 'qt-3', label: '🍜 Ăn sáng 40k', name: 'Ăn sáng bánh mì/phở', amount: 40000, type: 'expense', categoryId: 'food', accountId: 'wallet' },
  { id: 'qt-4', label: '⛽ Đổ xăng 50k', name: 'Đổ xăng xe máy', amount: 50000, type: 'expense', categoryId: 'transport', accountId: 'bank' },
];

export const seed:FinanceData={
  user:{
    id:'demo',
    name:'Minh Anh',
    email:'minhanh@example.com',
    currency:'VND',
    financialMonthStart:1,
    plan:'free',
    streakCount:5,
    lastCheckInDate:day(0),
    defaultAccountId:'wallet',
    nlpUsageToday:{date:day(0),count:1}
  },
  accounts:[
    {id:'bank',name:'Tài khoản chính',type:'bank',openingBalance:42000000,color:'#10b981',createdAt:day(180),active:true},
    {id:'wallet',name:'Ví điện tử',type:'ewallet',openingBalance:5200000,color:'#8b5cf6',createdAt:day(140),active:true},
    {id:'saving',name:'Quỹ tiết kiệm',type:'savings',openingBalance:18000000,color:'#f59e0b',createdAt:day(150),active:true},
    {id:'cash',name:'Tiền mặt',type:'cash',openingBalance:3200000,color:'#3b82f6',createdAt:day(90),active:true}
  ],
  categories:[
    ...['Ăn uống','Di chuyển','Nhà ở','Mua sắm','Giải trí','Sức khỏe','Học tập','Hóa đơn','Du lịch','Khác'].map((name,i)=>({
      id:['food','transport','housing','shopping','entertainment','health','education','bills','travel','other'][i],
      name,
      type:'expense' as const,
      icon:['Utensils','Car','House','ShoppingBag','Clapperboard','HeartPulse','BookOpen','Receipt','Plane','Shapes'][i],
      color:['#10b981','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#ef4444','#6366f1','#14b8a6','#06b6d4','#64748b'][i],
      hidden:false
    })),
    {
      id: 'reconcile-expense',
      name: 'Điều chỉnh số dư / Quên ghi',
      type: 'expense' as const,
      icon: 'Shapes',
      color: '#64748b',
      hidden: false
    },
    ...['Lương','Thưởng','Làm thêm','Đầu tư','Kinh doanh','Thu nhập khác'].map((name,i)=>({
      id:['salary','bonus','freelance','invest','business','income-other'][i],
      name,
      type:'income' as const,
      icon:'CircleDollarSign',
      color:'#10b981',
      hidden:false
    })),
    {
      id: 'reconcile-income',
      name: 'Điều chỉnh số dư / Quên ghi',
      type: 'income' as const,
      icon: 'CircleDollarSign',
      color: '#10b981',
      hidden: false
    }
  ],
  transactions,
  budgets:[
    {id:'b-food',name:'Ăn uống',categoryId:'food',limit:3000000,month},
    {id:'b-travel',name:'Di chuyển',categoryId:'transport',limit:1200000,month},
    {id:'b-shopping',name:'Mua sắm',categoryId:'shopping',limit:2500000,month},
    {id:'b-all',name:'Tổng chi tiêu',limit:17000000,month}
  ],
  goals:[
    {id:'g1',name:'Mua laptop',target:25000000,startDate:day(80),dueDate:day(-180),accountId:'saving',icon:'Laptop',contributions:[{id:'c1',amount:8500000,date:day(45),accountId:'saving'}]},
    {id:'g2',name:'Quỹ dự phòng',target:30000000,startDate:day(120),dueDate:day(-365),accountId:'saving',icon:'ShieldCheck',contributions:[{id:'c2',amount:16000000,date:day(30),accountId:'saving'}]},
    {id:'g3',name:'Du lịch Nhật Bản',target:10000000,startDate:day(35),dueDate:day(-210),accountId:'saving',icon:'Plane',contributions:[{id:'c3',amount:2800000,date:day(20),accountId:'saving'}]}
  ],
  debts:[
    {id:'d1',name:'Khoản vay mua xe',kind:'owed',principal:45000000,startDate:day(180),dueDate:day(-120),interestRate:0,payments:[{id:'p1',amount:12000000,date:day(40),note:'Đợt 1'}]},
    {id:'d2',name:'Bạn Nam mượn',kind:'lent',principal:5000000,startDate:day(60),dueDate:day(-20),payments:[{id:'p2',amount:1500000,date:day(10),note:'Trả một phần'}]},
    {id:'d3',name:'Trả góp điện thoại',kind:'owed',principal:12000000,startDate:day(90),dueDate:day(-75),payments:[{id:'p3',amount:4000000,date:day(15),note:'Đợt 2'}]}
  ],
  recurring:[
    {id:'r1',name:'Lương tháng',amount:28500000,type:'income',categoryId:'salary',accountId:'bank',frequency:'monthly',nextDate:day(-5),active:true,autoExecute:true},
    {id:'r2',name:'Tiền thuê nhà',amount:6500000,type:'expense',categoryId:'housing',accountId:'bank',frequency:'monthly',nextDate:day(-9),active:true,autoExecute:false},
    {id:'r3',name:'Gói nghe nhạc',amount:59000,type:'expense',categoryId:'entertainment',accountId:'wallet',frequency:'monthly',nextDate:day(-14),active:true,autoExecute:false}
  ],
  notifications:[
    {id:'n1',title:'Kiểm tra ngân sách tháng này',read:false,date:day(0)},
    {id:'n2',title:'Tiền thuê nhà sắp đến hạn',read:false,date:day(1)}
  ],
  quickTemplates: defaultQuickTemplates
};
