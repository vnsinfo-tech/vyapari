import { Link } from 'react-router-dom';
import { MdReceiptLong, MdInventory, MdBarChart, MdPeople, MdNotifications, MdCloudDownload, MdCheckCircle, MdArrowForward } from 'react-icons/md';

const features = [
  { icon: MdReceiptLong, title: 'GST Invoicing', desc: 'Create GST-compliant invoices with CGST/SGST/IGST, auto invoice numbering, and PDF download.' },
  { icon: MdInventory, title: 'Inventory Management', desc: 'Track stock levels, get low stock alerts, manage batch numbers and expiry dates.' },
  { icon: MdBarChart, title: 'Reports & Analytics', desc: 'Sales reports, GST summary, Profit & Loss, stock valuation — all in one place.' },
  { icon: MdPeople, title: 'Customer & Supplier', desc: 'Manage parties, track outstanding balances, and view full payment history.' },
  { icon: MdNotifications, title: 'Payment Reminders', desc: 'Send automated payment reminders via email to recover dues faster.' },
  { icon: MdCloudDownload, title: 'Data Backup', desc: 'Export your complete business data as JSON backup anytime.' },
];

const plans = [
  { name: 'Free', price: '₹0', period: 'forever', features: ['5 invoices/month', 'Basic inventory', 'Customer management', 'Email support'], cta: 'Get Started', highlight: false },
  { name: 'Silver', price: '₹499', period: 'per month', features: ['Unlimited invoices', 'Full inventory', 'All reports', 'Payment reminders', 'Staff access (2 users)', 'Priority support'], cta: 'Start Free Trial', highlight: true },
  { name: 'Gold', price: '₹999', period: 'per month', features: ['Everything in Silver', 'Unlimited staff', 'Advanced analytics', 'WhatsApp reminders', 'API access', 'Dedicated support'], cta: 'Contact Sales', highlight: false },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">V</div>
            <span className="font-bold text-gray-900 dark:text-white text-lg">Vyapari</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <span className="inline-block bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">GST-Ready Billing Software for Indian Businesses</span>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
          Manage Your Business<br />
          <span className="text-primary-600">Smarter & Faster</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Vyapari helps retailers, wholesalers, and service providers create GST invoices, manage inventory, track expenses, and grow their business — all from one simple dashboard.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register" className="btn-primary flex items-center gap-2 text-base px-6 py-3">
            Start for Free <MdArrowForward size={18} />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-6 py-3">
            View Demo
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">No credit card required · Free forever plan available</p>
      </section>

      {/* Stats */}
      <section className="bg-primary-600 py-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {[['10,000+', 'Businesses'], ['5 Lakh+', 'Invoices Generated'], ['₹500 Cr+', 'Revenue Tracked'], ['4.8★', 'Average Rating']].map(([val, label]) => (
            <div key={label}>
              <p className="text-2xl font-bold">{val}</p>
              <p className="text-sm text-primary-100 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything you need to run your business</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Built specifically for Indian MSMEs with GST compliance at the core</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                <Icon size={22} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 dark:bg-gray-800 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-10">Get started in 3 simple steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up free and set up your business profile with GSTIN and address.' },
              { step: '2', title: 'Add Products & Customers', desc: 'Import or add your inventory and customer list to get started.' },
              { step: '3', title: 'Start Billing', desc: 'Create GST invoices, track payments, and download PDF instantly.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">{step}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Simple, transparent pricing</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Start free, upgrade when you grow</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(({ name, price, period, features, cta, highlight }) => (
            <div key={name} className={`card relative ${highlight ? 'border-2 border-primary-500 shadow-lg' : ''}`}>
              {highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>}
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{price}</span>
                <span className="text-sm text-gray-500 ml-1">/{period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MdCheckCircle className="text-primary-600 shrink-0" size={16} /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className={`block text-center py-2 rounded-lg text-sm font-medium transition-colors ${highlight ? 'btn-primary' : 'btn-secondary'}`}>{cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-14 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Ready to simplify your business?</h2>
        <p className="text-primary-100 mb-6">Join thousands of Indian businesses already using Vyapari</p>
        <Link to="/register" className="bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors inline-flex items-center gap-2">
          Get Started Free <MdArrowForward size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>© {new Date().getFullYear()} Vyapari. Built for Indian MSMEs. GST-compliant billing software.</p>
        <p className="mt-1 text-xs">Demo: demo@vyapari.com / demo1234</p>
      </footer>
    </div>
  );
}
