import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  consultationType: 'عام' | 'استشارة قانونية' | 'دعوى قضائية' | 'عقود';
}

interface FormErrors {
  [key: string]: string;
}

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    consultationType: 'عام',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'بريد إلكتروني غير صحيح';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone) || formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'رقم هاتف غير صحيح';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'الموضوع مطلوب';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'الرسالة مطلوبة';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'الرسالة يجب أن تكون 10 أحرف على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        consultationType: 'عام',
      });

      // Reset success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      setErrors({ submit: 'حدث خطأ أثناء إرسال النموذج' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">تواصل معنا</h2>
          <p className="text-lg text-slate-600">نحن هنا للإجابة على أسئلتك والاستماع إلى احتياجاتك القانونية</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Contact Info Cards */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Phone className="w-6 h-6 text-blue-600 ml-3" />
              <h3 className="text-lg font-semibold text-slate-900">الهاتف</h3>
            </div>
            <p className="text-slate-600">+966 1 234 5678</p>
            <p className="text-slate-600">+966 1 234 5679</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Mail className="w-6 h-6 text-blue-600 ml-3" />
              <h3 className="text-lg font-semibold text-slate-900">البريد</h3>
            </div>
            <p className="text-slate-600">info@alhawari-law.com</p>
            <p className="text-slate-600">contact@alhawari-law.com</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <MapPin className="w-6 h-6 text-blue-600 ml-3" />
              <h3 className="text-lg font-semibold text-slate-900">العنوان</h3>
            </div>
            <p className="text-slate-600">الرياض، المملكة العربية السعودية</p>
            <p className="text-slate-600">الحي الدبلوماسي</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {submitSuccess && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 ml-3" />
              <div>
                <h4 className="font-semibold text-green-900">تم الإرسال بنجاح!</h4>
                <p className="text-green-700 text-sm">شكراً لتواصلك معنا. سنرد عليك قريباً</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition ${
                    errors.name ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'
                  }`}
                  placeholder="أدخل اسمك الكامل"
                  disabled={isSubmitting}
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition ${
                    errors.email ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'
                  }`}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Phone Input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition ${
                    errors.phone ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'
                  }`}
                  placeholder="+966 50 1234567"
                  disabled={isSubmitting}
                />
                {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
              </div>

              {/* Consultation Type */}
              <div>
                <label htmlFor="consultationType" className="block text-sm font-medium text-slate-700 mb-2">
                  نوع الاستشارة
                </label>
                <select
                  id="consultationType"
                  name="consultationType"
                  value={formData.consultationType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500 transition"
                  disabled={isSubmitting}
                >
                  <option value="عام">عام</option>
                  <option value="استشارة قانونية">استشارة قانونية</option>
                  <option value="دعوى قضائية">دعوى قضائية</option>
                  <option value="عقود">عقود وصيغ</option>
                </select>
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">
                الموضوع *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition ${
                  errors.subject ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'
                }`}
                placeholder="ما موضوع استفسارك؟"
                disabled={isSubmitting}
              />
              {errors.subject && <p className="text-red-600 text-sm mt-1">{errors.subject}</p>}
            </div>

            {/* Message Textarea */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                الرسالة *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition resize-vertical ${
                  errors.message ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'
                }`}
                placeholder="اكتب تفاصيل احتياجك القانوني هنا..."
                disabled={isSubmitting}
              />
              {errors.message && <p className="text-red-600 text-sm mt-1">{errors.message}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  إرسال الرسالة
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;