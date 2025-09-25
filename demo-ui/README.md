# 🤖 Forecasting Assistant Demo UI

A conversational chatbot interface for the Multivariate Forecasting Service, built with Next.js, React, and Gemini AI.

## 🌟 Features

- **Conversational Interface**: Jules-like chatbot experience for forecasting
- **Real-time Progress Tracking**: Visual progress indicators throughout the process
- **Interactive Data Upload**: Drag & drop file upload with validation
- **Live Data Preview**: Side panel showing dataset analysis and charts
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **AI-Powered Responses**: Gemini AI integration for intelligent conversations
- **Animated UI**: Smooth animations and transitions using Framer Motion

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Navigate to the demo directory**:
   ```bash
   cd demo-ui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Demo Flow

The demo showcases the complete forecasting workflow:

### 1. **Welcome & Upload** 📁
- Conversational greeting from the AI assistant
- File upload with drag & drop support
- Data validation and preview

### 2. **Data Analysis** 🔍
- Automatic data quality assessment
- Pattern detection (trend, seasonality)
- Preprocessing recommendations

### 3. **Data Processing** 🧹
- Outlier detection and treatment
- Feature engineering options
- Data transformation settings

### 4. **Model Selection** 🤖
- Algorithm recommendations based on data
- External regressor configuration
- Seasonality and holiday settings

### 5. **Model Training** 🏋️
- Real-time training progress
- Multiple algorithm comparison
- Performance metrics display

### 6. **Results & Export** 📊
- Interactive forecast charts
- Model performance comparison
- Export options and formats

## 🎨 UI Components

### **Chat Interface**
- Message bubbles with different types (user, assistant, system, error)
- Interactive option buttons
- File upload integration
- Typing indicators

### **Progress Tracker**
- Step-by-step progress visualization
- Animated progress bar
- Current step highlighting

### **Data Preview Panel**
- Dataset statistics and overview
- Sample data table
- Data quality indicators
- Column information

### **Forecast Charts**
- Interactive time series plots
- Confidence intervals
- Model performance comparison
- Feature importance visualization

## 🔧 Configuration

### **Environment Variables**

Create a `.env.local` file in the demo-ui directory:

```env
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyAhG6nkwRaeP_XoFfrKkSfBZItPDkvj7_g
```

### **Customization**

#### **Styling**
- Modify `app/globals.css` for global styles
- Update `tailwind.config.js` for theme customization
- Component-specific styles in individual component files

#### **AI Responses**
- Edit `app/utils/geminiApi.ts` to customize AI behavior
- Modify prompts and response logic
- Add new conversation flows

#### **Demo Data**
- Update mock data in component files
- Add new sample datasets
- Customize chart configurations

## 📱 Responsive Design

The interface adapts to different screen sizes:

- **Mobile (< 768px)**: Chat-only view with collapsible panels
- **Tablet (768px - 1024px)**: Chat + sidebar layout
- **Desktop (> 1024px)**: Full three-panel layout with charts

## 🎭 Animation System

Built with Framer Motion for smooth interactions:

- **Message animations**: Slide-up entrance effects
- **Progress animations**: Smooth progress bar transitions
- **Chart animations**: Staggered data visualization
- **Loading states**: Typing indicators and spinners

## 🔌 API Integration

### **Gemini AI Integration**
- Natural language processing for user queries
- Context-aware responses based on current step
- Fallback responses for error handling

### **Mock Data Services**
- Simulated file upload and processing
- Fake model training with realistic timing
- Sample forecast data generation

## 🛠️ Development

### **Project Structure**
```
demo-ui/
├── app/
│   ├── components/          # React components
│   │   ├── ChatMessage.tsx  # Chat message component
│   │   ├── ProgressTracker.tsx
│   │   ├── FileUpload.tsx
│   │   ├── DataPreview.tsx
│   │   └── ForecastChart.tsx
│   ├── utils/
│   │   └── geminiApi.ts     # AI integration
│   ├── types.ts             # TypeScript definitions
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # App layout
│   └── page.tsx             # Main page component
├── public/                  # Static assets
├── package.json
├── tailwind.config.js
└── next.config.js
```

### **Key Technologies**
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Animation library
- **Recharts**: Chart visualization
- **React Dropzone**: File upload handling
- **Google Generative AI**: Gemini API integration

### **Adding New Features**

1. **New Chat Steps**: Add to `ProcessingStep` type and update flow logic
2. **Custom Components**: Create in `app/components/` directory
3. **New Charts**: Extend `ForecastChart.tsx` or create new chart components
4. **AI Responses**: Modify `generateAIResponse` function in `geminiApi.ts`

## 🚀 Deployment

### **Vercel (Recommended)**
```bash
npm run build
vercel --prod
```

### **Docker**
```bash
docker build -t forecasting-demo .
docker run -p 3000:3000 forecasting-demo
```

### **Static Export**
```bash
npm run build
npm run export
```

## 🎯 Demo Scenarios

The demo includes several pre-built scenarios:

1. **Retail Sales Forecasting**: Daily sales with weather and marketing data
2. **Quick Demo Flow**: Streamlined process with sample data
3. **Custom Upload**: User-provided dataset analysis
4. **Error Handling**: Demonstrates error states and recovery

## 📊 Performance

- **Initial Load**: < 2 seconds
- **Chat Response Time**: < 1 second (with Gemini API)
- **Animation Performance**: 60fps on modern devices
- **Bundle Size**: ~500KB gzipped

## 🔍 Testing

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## 📝 License

This demo is part of the Multivariate Forecasting Service specification and is intended for demonstration purposes.

## 🤝 Contributing

This is a demo application. For the full implementation, refer to the main forecasting service specification.

---

**Note**: This is a demonstration UI that simulates the forecasting process. In the actual implementation, it would connect to real backend services for data processing and model training.