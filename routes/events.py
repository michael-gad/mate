from flask import Blueprint, request, jsonify
from database import get_session, Weight, Litter

events_bp = Blueprint('events', __name__)

@events_bp.route('/api/weights/<mouse_id>', methods=['GET'])
def get_weights(mouse_id):
    session = get_session()
    try:
        rows = session.query(Weight).filter_by(mouse_id=mouse_id).order_by(Weight.date.desc()).all()
        return jsonify([{'id': r.id, 'mouse_id': r.mouse_id, 'date': r.date, 'weight': r.weight} for r in rows])
    finally:
        session.close()

@events_bp.route('/api/weights', methods=['POST'])
def add_weight():
    data = request.json
    if not data.get('mouse_id') or not data.get('date') or data.get('weight') is None:
        return jsonify({'error': 'Missing fields'}), 400
    session = get_session()
    try:
        session.add(Weight(mouse_id=data['mouse_id'], date=data['date'], weight=float(data['weight'])))
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()

@events_bp.route('/api/weights/<int:record_id>', methods=['PUT'])
def update_weight(record_id):
    data = request.json
    session = get_session()
    try:
        w = session.query(Weight).filter_by(id=record_id).first()
        if not w:
            return jsonify({'error': 'Not found'}), 404
        w.date = data['date']
        w.weight = float(data['weight'])
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()

@events_bp.route('/api/weights/<int:record_id>', methods=['DELETE'])
def delete_weight(record_id):
    session = get_session()
    try:
        session.query(Weight).filter_by(id=record_id).delete()
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()

@events_bp.route('/api/litters/<mouse_id>', methods=['GET'])
def get_litters(mouse_id):
    session = get_session()
    try:
        rows = session.query(Litter).filter_by(mouse_id=mouse_id).order_by(Litter.birth_date.desc()).all()
        return jsonify([{'id': r.id, 'mouse_id': r.mouse_id, 'birth_date': r.birth_date,
                         'pups_count': r.pups_count, 'weaning_date': r.weaning_date} for r in rows])
    finally:
        session.close()

@events_bp.route('/api/litters', methods=['POST'])
def add_litter():
    data = request.json
    if not data.get('mouse_id') or not data.get('birth_date'):
        return jsonify({'error': 'Missing fields'}), 400
    session = get_session()
    try:
        session.add(Litter(
            mouse_id=data['mouse_id'], birth_date=data['birth_date'],
            pups_count=data.get('pups_count', 0), weaning_date=data.get('weaning_date', '')
        ))
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()

@events_bp.route('/api/litters/<int:record_id>', methods=['PUT'])
def update_litter(record_id):
    data = request.json
    session = get_session()
    try:
        l = session.query(Litter).filter_by(id=record_id).first()
        if not l:
            return jsonify({'error': 'Not found'}), 404
        l.birth_date = data['birth_date']
        l.pups_count = data.get('pups_count', 0)
        l.weaning_date = data.get('weaning_date', '')
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()

@events_bp.route('/api/litters/<int:record_id>', methods=['DELETE'])
def delete_litter(record_id):
    session = get_session()
    try:
        session.query(Litter).filter_by(id=record_id).delete()
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()
