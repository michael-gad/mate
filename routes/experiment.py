from flask import Blueprint, request, jsonify
from database import get_session, Mouse, Experiment, PregWeight
from datetime import datetime, timedelta

experiment_bp = Blueprint('experiment', __name__)

def _sibling_reason(male, female):
    mf = (male.father or '').strip()
    mm = (male.mother or '').strip()
    ff = (female.father or '').strip()
    fm = (female.mother or '').strip()
    shared_father = mf and ff and mf == ff
    shared_mother = mm and fm and mm == fm
    if shared_father and shared_mother:
        return f'Full siblings (father: {mf}, mother: {mm})'
    if shared_father:
        return f'Half siblings – same father ({mf})'
    if shared_mother:
        return f'Half siblings – same mother ({mm})'
    return None

@experiment_bp.route('/api/males')
def get_males():
    female_id = request.args.get('female_id', '')
    session = get_session()
    try:
        males  = session.query(Mouse).filter_by(sex='M').all()
        female = session.query(Mouse).filter_by(mouse_id=female_id).first() if female_id else None
        return jsonify([{
            'mouse_id': m.mouse_id,
            'sibling_reason': _sibling_reason(m, female) if female else None
        } for m in males])
    finally:
        session.close()

@experiment_bp.route('/api/experiment/active')
def get_active_experiment():
    female_id = request.args.get('female_id')
    session = get_session()
    try:
        exp = session.query(Experiment).filter_by(female_id=female_id)\
                     .order_by(Experiment.id.desc()).first()
        return jsonify(_exp_dict(exp) if exp else None)
    finally:
        session.close()

@experiment_bp.route('/api/experiment/history')
def get_experiment_history():
    female_id = request.args.get('female_id')
    session = get_session()
    try:
        exps = session.query(Experiment).filter_by(female_id=female_id)\
                      .order_by(Experiment.id.desc()).all()
        return jsonify([_exp_dict(e) for e in exps])
    finally:
        session.close()

@experiment_bp.route('/api/experiment', methods=['POST'])
def save_experiment():
    data = request.json
    female_id, male_id, mating_date = data.get('female_id'), data.get('male_id'), data.get('mating_date')
    if not all([female_id, male_id, mating_date]):
        return jsonify({'error': 'Missing fields'}), 400
    session = get_session()
    try:
        male   = session.query(Mouse).filter_by(mouse_id=male_id).first()
        female = session.query(Mouse).filter_by(mouse_id=female_id).first()
        if male and female:
            reason = _sibling_reason(male, female)
            if reason:
                return jsonify({'error': f'Cannot mate: {reason}'}), 400
        sac_date = (datetime.strptime(mating_date, '%Y-%m-%d') + timedelta(days=14)).strftime('%Y-%m-%d')
        exp = Experiment(female_id=female_id, male_id=male_id,
                         mating_date=mating_date, sacrifice_date=sac_date)
        session.add(exp)
        session.commit()
        return jsonify({'success': True, 'experiment_id': exp.id})
    finally:
        session.close()

@experiment_bp.route('/api/preg_weights')
def get_preg_weights():
    exp_id = request.args.get('experiment_id')
    session = get_session()
    try:
        rows = session.query(PregWeight).filter_by(experiment_id=exp_id)\
                      .order_by(PregWeight.date.asc()).all()
        return jsonify([_pw_dict(r) for r in rows])
    finally:
        session.close()

@experiment_bp.route('/api/preg_weights', methods=['POST'])
def add_preg_weight():
    data = request.json
    exp_id = data.get('experiment_id')
    session = get_session()
    try:
        existing = session.query(PregWeight).filter_by(
            experiment_id=exp_id, date=data['date']).first()
        if existing:
            existing.weight = data['weight']
            existing.gd_day = data.get('gd_day', 0)
        else:
            session.add(PregWeight(
                experiment_id=exp_id, female_id=data['female_id'],
                date=data['date'], weight=data['weight'], gd_day=data.get('gd_day', 0)
            ))
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()

@experiment_bp.route('/api/preg_weights/<int:exp_id>/<date>', methods=['DELETE'])
def delete_preg_weight(exp_id, date):
    session = get_session()
    try:
        session.query(PregWeight).filter_by(experiment_id=exp_id, date=date).delete()
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()

def _exp_dict(e):
    return {'id': e.id, 'female_id': e.female_id, 'male_id': e.male_id,
            'mating_date': e.mating_date, 'sacrifice_date': e.sacrifice_date}

def _pw_dict(p):
    return {'id': p.id, 'experiment_id': p.experiment_id, 'female_id': p.female_id,
            'date': p.date, 'weight': p.weight, 'gd_day': p.gd_day}
