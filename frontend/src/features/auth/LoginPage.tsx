// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Lock, Mail, ArrowRight, RefreshCcw } from 'lucide-react';
// import { useAuthStore } from '../../store/useAuthStore';
// import api from '../../api';
// import brandImage from '../../assets/brand_image.png';

// const LoginPage: React.FC = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [captchaText, setCaptchaText] = useState('');
//   const [captchaInput, setCaptchaInput] = useState('');
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const { setToken, setUser } = useAuthStore();
//   const navigate = useNavigate();

//   const generateCaptcha = () => {
//     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
//     let text = '';
//     for (let i = 0; i < 6; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
//     setCaptchaText(text);
//     setCaptchaInput('');
//   };

//   useEffect(() => {
//     generateCaptcha();
//   }, []);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas || !captchaText) return;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;

//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     ctx.fillStyle = '#f8fafc';
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     // Add noise lines
//     for (let i = 0; i < 6; i++) {
//       ctx.beginPath();
//       ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
//       ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
//       ctx.strokeStyle = `rgba(15, 23, 42, ${Math.random() * 0.2 + 0.1})`;
//       ctx.lineWidth = Math.random() * 2 + 1;
//       ctx.stroke();
//     }

//     // Add noise dots
//     for (let i = 0; i < 60; i++) {
//       ctx.beginPath();
//       ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2, 0, Math.PI * 2);
//       ctx.fillStyle = `rgba(15, 23, 42, ${Math.random() * 0.2})`;
//       ctx.fill();
//     }

//     ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
//     ctx.textBaseline = 'middle';

//     // Draw text with random rotations and positions
//     for (let i = 0; i < captchaText.length; i++) {
//       ctx.save();
//       const x = 20 + (i * 20);
//       const y = canvas.height / 2 + (Math.random() * 8 - 4);
//       ctx.translate(x, y);
//       ctx.rotate((Math.random() - 0.5) * 0.5);
//       ctx.fillStyle = '#0f172a';
//       ctx.fillText(captchaText[i], 0, 0);
//       ctx.restore();
//     }
//   }, [captchaText]);

//   useEffect(() => {
//     if (error) {
//       const timer = setTimeout(() => {
//         setError('');
//       }, 4000);
//       return () => clearTimeout(timer);
//     }
//   }, [error]);

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
//       setError('Invalid security verification. Please try again.');
//       generateCaptcha();
//       setLoading(false);
//       return;
//     }

//     try {
//       const formData = new URLSearchParams();
//       formData.append('username', email);
//       formData.append('password', password);

//       const response = await api.post('/api/auth/token', formData, {
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//       });

//       const token = response.data.access_token;
//       setToken(token);

//       const userResponse = await api.get('/api/auth/me');
//       setUser(userResponse.data);

//       navigate('/');
//     } catch (err: any) {
//       setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="h-screen overflow-hidden flex flex-col bg-white dark:bg-slate-900 font-sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
//       {/* Enterprise Top Bar */}
//       <div className="h-16 shrink-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-8 justify-between z-20 relative transition-colors duration-200">
//         <div className="flex items-center gap-2">
//           <span className="text-2xl font-black text-[#002E6E] dark:text-white tracking-tighter uppercase transition-colors duration-200">Indian Oil BI Platform</span>
//         </div>
//       </div>

//       <div className="flex-1 flex overflow-hidden">
//         {/* Visual Side (Left) - Hidden on mobile */}
//         <div className="hidden lg:flex lg:w-1/2 relative bg-white dark:bg-slate-900 h-full items-center justify-center p-12 transition-colors duration-200">
//           <img src={brandImage} alt="Brand" className="max-w-full max-h-full object-contain ml-24 drop-shadow-sm rounded-3xl" />
//         </div>

//         {/* Form Side (Right) */}
//         <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-16 h-full overflow-y-auto">
//           <div className="w-full max-w-md lg:mr-24">

//             <div className="mb-10">
//               <h1 className="text-4xl font-extrabold text-[#002E6E] dark:text-white mb-2 tracking-tight transition-colors duration-200">Welcome</h1>
//               <p className="text-slate-500 dark:text-slate-400 font-medium text-lg transition-colors duration-200">Secure enterprise data platform access</p>
//             </div>

//             {error && (
//               <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
//                 <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
//                   <Lock size={14} />
//                 </div>
//                 <p className="font-semibold">{error}</p>
//               </div>
//             )}

//             <form onSubmit={handleLogin} className="space-y-6">
//               <div className="space-y-2">
//                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1 transition-colors duration-200">Work Email</label>
//                 <div className="relative group">
//                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-[#F37021] transition-colors">
//                     <Mail size={18} />
//                   </div>
//                   <input
//                     type="email"
//                     required
//                     autoFocus
//                     className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:ring-[#002E6E]/10 dark:focus:ring-[#F37021]/20 focus:border-[#002E6E] dark:focus:border-[#F37021] focus:bg-white dark:focus:bg-slate-900 transition-all outline-none shadow-sm"
//                     placeholder="name@indianoil.in"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     onFocus={() => setError('')}
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <div className="flex items-center justify-between ml-1">
//                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider transition-colors duration-200">Password</label>
//                 </div>
//                 <div className="relative group">
//                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-[#F37021] transition-colors">
//                     <Lock size={18} />
//                   </div>
//                   <input
//                     type="password"
//                     required
//                     className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:ring-[#002E6E]/10 dark:focus:ring-[#F37021]/20 focus:border-[#002E6E] dark:focus:border-[#F37021] focus:bg-white dark:focus:bg-slate-900 transition-all outline-none shadow-sm"
//                     placeholder="••••••••••••"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     onFocus={() => setError('')}
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1 transition-colors duration-200">Security Verification</label>
//                 <div className="flex gap-3">
//                   <div className="relative flex-1 group">
//                     <input
//                       type="text"
//                       required
//                       className="block w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-4 focus:ring-[#002E6E]/10 dark:focus:ring-[#F37021]/20 focus:border-[#002E6E] dark:focus:border-[#F37021] focus:bg-white dark:focus:bg-slate-900 transition-all outline-none shadow-sm"
//                       placeholder="Enter CAPTCHA"
//                       value={captchaInput}
//                       onChange={(e) => setCaptchaInput(e.target.value.replace(/\s/g, ''))}
//                       onFocus={() => setError('')}
//                     />
//                   </div>
//                   <div className="shrink-0 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 pr-2 shadow-sm transition-colors duration-200">
//                     <canvas ref={canvasRef} width="140" height="46" className="rounded-lg cursor-pointer" onClick={generateCaptcha} title="Click to regenerate" />
//                     <button type="button" onClick={generateCaptcha} className="p-2 text-slate-400 dark:text-slate-500 hover:text-[#F37021] hover:bg-[#F37021]/10 rounded-lg transition-colors" title="Regenerate CAPTCHA">
//                       <RefreshCcw size={16} />
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="group relative w-full flex items-center justify-center gap-2 py-4 bg-[#F37021] hover:bg-[#E06015] text-white rounded-xl font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-[#F37021]/25"
//               >
//                 {loading ? (
//                   <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
//                 ) : (
//                   <>
//                     <span>Sign into Account</span>
//                     <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
//                   </>
//                 )}
//               </button>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;



import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, BarChart3, Database, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../api';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/api/auth/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const token = response.data.access_token;
      setToken(token);

      const userResponse = await api.get('/api/auth/me');
      setUser(userResponse.data);

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Visual Side (Left) - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
        {/* Abstract Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600 blur-[120px] animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/40 rotate-3">
              <BarChart3 className="text-white" size={28} />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter">ANTIGRAVITY <span className="text-brand">BI</span></span>
          </div>
          
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Turn your data into <span className="text-brand">decisions.</span>
          </h1>
          
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            Enterprise-grade analytics platform designed for modern teams. Secure, scalable, and powered by AI.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 w-10 h-10 shrink-0 rounded-xl bg-slate-800 flex items-center justify-center text-brand border border-slate-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-white font-bold">Secure by Design</h4>
                <p className="text-sm text-slate-500">RBAC and enterprise-level encryption for all your data assets.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 w-10 h-10 shrink-0 rounded-xl bg-slate-800 flex items-center justify-center text-brand border border-slate-700">
                <Database size={20} />
              </div>
              <div>
                <h4 className="text-white font-bold">Unified Data Layer</h4>
                <p className="text-sm text-slate-500">Connect to Oracle, PostgreSQL, and more in seconds.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 w-10 h-10 shrink-0 rounded-xl bg-slate-800 flex items-center justify-center text-brand border border-slate-700">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="text-white font-bold">AI Augmented Insights</h4>
                <p className="text-sm text-slate-500">Natural language queries and automated data discovery.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side (Right) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <BarChart3 className="text-brand" size={24} />
            <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">BI PLATFORM</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Sign In</h2>
            <p className="text-slate-500 font-medium">Enter your credentials to access your workspace</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Lock size={14} />
              </div>
              <p className="font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Work Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-medium focus:ring-4 focus:ring-brand/10 focus:border-brand focus:bg-white transition-all outline-none"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setError('')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-medium focus:ring-4 focus:ring-brand/10 focus:border-brand focus:bg-white transition-all outline-none"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setError('')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-xl shadow-slate-900/10"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign into Account</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
