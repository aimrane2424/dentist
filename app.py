"""
SmileDent - تطبيق حجز مواعيد عيادة الأسنان
نسخة معدلة للنشر على Koyeb و Railway
تمت إضافة قاعدة بيانات SQLite لتخزين المواعيد
"""

from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import json
from datetime import datetime, timedelta
import os
import sqlite3
from functools import wraps
from dotenv import load_dotenv

# تحميل المتغيرات البيئية من ملف .env
load_dotenv()

# تهيئة تطبيق Flask
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dentiste_smile_secret_key_2024_secure_123')
app.config['ADMIN_USERNAME'] = os.environ.get('ADMIN_USERNAME', 'admin')
app.config['ADMIN_PASSWORD'] = os.environ.get('ADMIN_PASSWORD', 'admin123')

# اسم ملف قاعدة البيانات
DATABASE = 'dentist.db'

# ========== دوال قاعدة البيانات SQLite ==========

def init_db():
    """
    إنشاء قاعدة البيانات والجداول إذا لم تكن موجودة
    """
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # إنشاء جدول المواعيد
    c.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            service TEXT NOT NULL,
            dentist TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            submitted_at TEXT NOT NULL,
            notes TEXT
        )
    ''')
    
    # إنشاء جدول المستخدمين (للمستقبل إذا أردنا إضافة مستخدمين أكثر)
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    # إدخال مستخدم المدير إذا لم يكن موجوداً
    try:
        c.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                  (app.config['ADMIN_USERNAME'], app.config['ADMIN_PASSWORD']))
    except sqlite3.IntegrityError:
        pass  # المستخدم موجود مسبقاً
    
    conn.commit()
    conn.close()
    print("✅ تم تهيئة قاعدة البيانات بنجاح")

def get_db_connection():
    """
    إنشاء اتصال بقاعدة البيانات
    """
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # للحصول على نتائج على شكل قاموس
    return conn

def load_appointments():
    """
    جلب جميع المواعيد من قاعدة البيانات
    """
    conn = get_db_connection()
    appointments = conn.execute('SELECT * FROM appointments ORDER BY date DESC, time DESC').fetchall()
    conn.close()
    
    # تحويل إلى قائمة من القواميس
    result = []
    for appointment in appointments:
        result.append(dict(appointment))
    
    return result

def save_appointment(appointment_data):
    """
    حفظ موعد جديد في قاعدة البيانات
    """
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO appointments (id, full_name, phone, email, service, dentist, date, time, submitted_at, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            appointment_data['id'],
            appointment_data['full_name'],
            appointment_data['phone'],
            appointment_data['email'],
            appointment_data['service'],
            appointment_data.get('dentist', ''),
            appointment_data['date'],
            appointment_data['time'],
            appointment_data['submitted_at'],
            appointment_data.get('notes', '')
        ))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ خطأ في حفظ الموعد: {e}")
        return False

def delete_appointment_by_id(appointment_id):
    """
    حذف موعد بواسطة المعرف
    """
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM appointments WHERE id = ?', (appointment_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ خطأ في حذف الموعد: {e}")
        return False

# ========== دوال المساعدة ==========

def is_date_in_current_week(date_str):
    """
    التحقق إذا كان التاريخ في الأسبوع الحالي
    """
    try:
        if not date_str:
            return False
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        today = datetime.now()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        return start_of_week.date() <= date_obj.date() <= end_of_week.date()
    except ValueError:
        return False

def count_by_service(appointments):
    """
    حساب عدد المواعيد حسب الخدمة
    """
    service_count = {}
    for appointment in appointments:
        service = appointment.get('service', 'Non spécifié')
        service_count[service] = service_count.get(service, 0) + 1
    return service_count

# ========== حماية صفحات المدير ==========

def login_required(f):
    """
    مصادقة الدخول للصفحات المحمية
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            flash('Veuillez vous connecter pour accéder à cette page.', 'error')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# ========== الصفحات الرئيسية ==========

@app.route('/')
def index():
    """
    الصفحة الرئيسية
    """
    return render_template('index.html')

@app.route('/about')
def about():
    """
    صفحة عن العيادة
    """
    return render_template('about.html')

@app.route('/services')
def services():
    """
    صفحة الخدمات
    """
    return render_template('services.html')

@app.route('/dentists')
def dentists():
    """
    صفحة أطباء الأسنان
    """
    return render_template('dentists.html')

@app.route('/appointment', methods=['GET', 'POST'])
def appointment():
    """
    صفحة حجز موعد (GET لعرض النموذج، POST لحفظ البيانات)
    """
    if request.method == 'POST':
        # جمع بيانات النموذج
        appointment_data = {
            'id': datetime.now().strftime("%Y%m%d%H%M%S"),
            'full_name': request.form.get('full_name', '').strip(),
            'phone': request.form.get('phone', '').strip(),
            'email': request.form.get('email', '').strip(),
            'service': request.form.get('service', ''),
            'dentist': request.form.get('dentist', ''),
            'date': request.form.get('date', ''),
            'time': request.form.get('time', ''),
            'submitted_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'notes': request.form.get('notes', '').strip()
        }
        
        # التحقق من الحقول المطلوبة
        required_fields = ['full_name', 'phone', 'email', 'date', 'time', 'service']
        missing_fields = [field for field in required_fields if not appointment_data[field]]
        
        if missing_fields:
            flash('Veuillez remplir tous les champs obligatoires.', 'error')
            return redirect(url_for('appointment'))
        
        # التحقق من صحة البريد الإلكتروني
        if '@' not in appointment_data['email'] or '.' not in appointment_data['email']:
            flash('Veuillez saisir une adresse email valide.', 'error')
            return redirect(url_for('appointment'))
        
        # حفظ الموعد في قاعدة البيانات
        if save_appointment(appointment_data):
            flash('✅ Rendez-vous enregistré avec succès!', 'success')
            return redirect(url_for('confirmation', appointment_id=appointment_data['id']))
        else:
            flash('❌ Erreur lors de l\'enregistrement du rendez-vous.', 'error')
            return redirect(url_for('appointment'))
    
    # عرض نموذج الحجز
    return render_template('appointment.html')

@app.route('/confirmation')
def confirmation():
    """
    صفحة تأكيد الحجز
    """
    appointment_id = request.args.get('appointment_id', '')
    return render_template('confirmation.html', appointment_id=appointment_id)

@app.route('/contact')
def contact():
    """
    صفحة الاتصال
    """
    return render_template('contact.html')

# ========== صفحات الإدارة ==========

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """
    صفحة دخول المدير
    """
    # إذا كان المستخدم مسجلاً مسبقاً، إعادة التوجيه للوحة التحكم
    if session.get('logged_in'):
        return redirect(url_for('admin_dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        # التحقق من بيانات الدخول
        conn = get_db_connection()
        user = conn.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            (username, password)
        ).fetchone()
        conn.close()
        
        if user:
            session['logged_in'] = True
            session['username'] = username
            flash('✅ Connexion réussie!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('❌ Identifiants incorrects. Veuillez réessayer.', 'error')
    
    return render_template('admin_login.html')

@app.route('/admin')
@login_required
def admin_dashboard():
    """
    لوحة تحكم المدير - عرض جميع المواعيد والإحصائيات
    """
    appointments = load_appointments()
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # حساب الإحصائيات
    stats = {
        'total': len(appointments),
        'today': len([a for a in appointments if a.get('date') == today_str]),
        'this_week': len([a for a in appointments if is_date_in_current_week(a.get('date', ''))]),
        'by_service': count_by_service(appointments)
    }
    
    return render_template('admin_dashboard.html', 
                         appointments=appointments, 
                         stats=stats,
                         now=datetime.now())

@app.route('/admin/delete/<appointment_id>', methods=['POST'])
@login_required
def delete_appointment(appointment_id):
    """
    حذف موعد من قاعدة البيانات
    """
    if delete_appointment_by_id(appointment_id):
        flash(f'✅ Rendez-vous {appointment_id} supprimé avec succès.', 'success')
    else:
        flash('❌ Rendez-vous non trouvé.', 'error')
    
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/logout')
def admin_logout():
    """
    تسجيل خروج المدير
    """
    session.clear()
    flash('Vous avez été déconnecté.', 'info')
    return redirect(url_for('admin_login'))

# ========== واجهة برمجة التطبيقات (API) ==========

@app.route('/api/appointments')
@login_required
def api_appointments():
    """
    API لجلب جميع المواعيد (تستخدم في تصدير CSV)
    """
    appointments = load_appointments()
    return jsonify(appointments)

@app.route('/api/services')
def get_services():
    """
    API لجلب قائمة الخدمات
    """
    services = [
        {"id": "consultation", "name": "Consultation générale"},
        {"id": "detartrage", "name": "Détartrage"},
        {"id": "blanchiment", "name": "Blanchiment dentaire"},
        {"id": "soins", "name": "Soins dentaires"},
        {"id": "urgence", "name": "Urgence dentaire"},
        {"id": "orthodontie", "name": "Orthodontie"},
        {"id": "implant", "name": "Implantologie"}
    ]
    return jsonify(services)

@app.route('/api/dentists')
def get_dentists():
    """
    API لجلب قائمة أطباء الأسنان
    """
    dentists = [
        {"id": "dr-martin", "name": "Dr. Sophie Martin"},
        {"id": "dr-lambert", "name": "Dr. Thomas Lambert"},
        {"id": "dr-dubois", "name": "Dr. Claire Dubois"},
        {"id": "dr-moreau", "name": "Dr. Julien Moreau"}
    ]
    return jsonify(dentists)

# ========== صفحات الأخطاء ==========

@app.errorhandler(404)
def page_not_found(e):
    """
    صفحة 404 - الصفحة غير موجودة
    """
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    """
    صفحة 500 - خطأ داخلي في الخادم
    """
    return render_template('500.html'), 500

# ========== صفحات الاختبار والتهيئة ==========

@app.route('/test')
def test():
    """
    صفحة اختبار للتأكد من عمل التطبيق
    """
    return "✅ Le serveur Flask fonctionne correctement!"

@app.route('/test-appointment')
def test_appointment():
    """
    إنشاء موعد تجريبي (للاختبار فقط)
    """
    test_data = {
        'id': datetime.now().strftime("%Y%m%d%H%M%S"),
        'full_name': 'Jean Dupont',
        'phone': '01 23 45 67 89',
        'email': 'jean@test.com',
        'service': 'consultation',
        'dentist': 'dr-martin',
        'date': datetime.now().strftime("%Y-%m-%d"),
        'time': '14:30',
        'submitted_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'notes': 'Rendez-vous de test'
    }
    
    if save_appointment(test_data):
        return "✅ Rendez-vous de test créé avec succès!"
    else:
        return "❌ Erreur lors de la création du rendez-vous de test"

@app.route('/migrate')
def migrate_data():
    """
    نقل البيانات من ملف JSON القديم إلى قاعدة بيانات SQLite
    (تشغيل مرة واحدة فقط)
    """
    if os.path.exists('appointments.json'):
        try:
            with open('appointments.json', 'r', encoding='utf-8') as f:
                old_appointments = json.load(f)
            
            migrated_count = 0
            for appointment in old_appointments:
                # التحقق إذا كان الموعد موجوداً مسبقاً
                conn = get_db_connection()
                existing = conn.execute(
                    'SELECT id FROM appointments WHERE id = ?',
                    (appointment['id'],)
                ).fetchone()
                conn.close()
                
                if not existing:
                    if save_appointment(appointment):
                        migrated_count += 1
            
            return f"✅ تم نقل {migrated_count} موعد من JSON إلى قاعدة البيانات"
        except Exception as e:
            return f"❌ خطأ في نقل البيانات: {e}"
    else:
        return "❌ ملف appointments.json غير موجود"

# ========== تهيئة وتشغيل التطبيق ==========

def create_templates():
    """
    إنشاء صفحات HTML للأخطاء إذا لم تكن موجودة
    """
    templates_dir = 'templates'
    os.makedirs(templates_dir, exist_ok=True)
    
    # صفحة 404
    if not os.path.exists(os.path.join(templates_dir, '404.html')):
        with open(os.path.join(templates_dir, '404.html'), 'w', encoding='utf-8') as f:
            f.write('''
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page non trouvée - SmileDent</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
</head>
<body>
    <div class="container" style="text-align: center; padding: 100px 20px;">
        <h1 style="font-size: 4rem;">404</h1>
        <h2>Page non trouvée</h2>
        <p>La page que vous cherchez n'existe pas.</p>
        <a href="{{ url_for('index') }}" class="btn btn-primary">Retour à l'accueil</a>
    </div>
</body>
</html>
            ''')
    
    # صفحة 500
    if not os.path.exists(os.path.join(templates_dir, '500.html')):
        with open(os.path.join(templates_dir, '500.html'), 'w', encoding='utf-8') as f:
            f.write('''
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erreur serveur - SmileDent</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
</head>
<body>
    <div class="container" style="text-align: center; padding: 100px 20px;">
        <h1 style="font-size: 4rem;">500</h1>
        <h2>Erreur interne du serveur</h2>
        <p>Une erreur s'est produite. Veuillez réessayer plus tard.</p>
        <a href="{{ url_for('index') }}" class="btn btn-primary">Retour à l'accueil</a>
    </div>
</body>
</html>
            ''')

if __name__ == '__main__':
    # تهيئة قاعدة البيانات
    init_db()
    
    # إنشاء صفحات الأخطاء إذا لزم الأمر
    create_templates()
    
    # عرض معلومات التشغيل
    print("=" * 60)
    print("🚀 SmileDent - Cabinet Dentaire")
    print("=" * 60)
    print(f"🌐 Site principal: http://localhost:5000")
    print(f"🔐 Administration: http://localhost:5000/admin/login")
    print(f"👤 Identifiants admin: {app.config['ADMIN_USERNAME']} / {app.config['ADMIN_PASSWORD']}")
    print("=" * 60)
    
    # تشغيل التطبيق
    app.run(debug=True, host='0.0.0.0', port=5000)