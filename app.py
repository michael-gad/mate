from flask import Flask, render_template, jsonify
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from database import init_db, get_session

app = Flask(__name__)

# רישום ה-Blueprints
from routes.cages      import cages_bp
from routes.mice       import mice_bp
from routes.data_io    import data_io_bp
from routes.events     import events_bp
from routes.experiment import experiment_bp

app.register_blueprint(cages_bp)
app.register_blueprint(mice_bp)
app.register_blueprint(data_io_bp)
app.register_blueprint(events_bp)
app.register_blueprint(experiment_bp)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/init_db')
def run_init_db():
    init_db()
    return jsonify({'success': True, 'message': 'DB initialized / updated'})

@app.route('/api/stats')
def get_stats():
    session = get_session()
    try:
        from database import Mouse
        total = session.query(Mouse).count()
        return jsonify({'total_mice': total})
    finally:
        session.close()

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
