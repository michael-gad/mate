from flask import Blueprint, request, jsonify
from database import get_session, Mouse, Archive, Cage
from datetime import datetime, timedelta

mice_bp = Blueprint('mice', __name__)

def _mouse_dict(m):
    return {
        'mouse_id': m.mouse_id, 'mark': m.mark, 'sex': m.sex, 'dob': m.dob,
        'cage_id': m.cage_id, 'father': m.father or '', 'mother': m.mother or '',
        'cbz_start': m.cbz_start or ''
    }

def _archive_dict(a):
    return {
        'id': a.id, 'mouse_id': a.mouse_id, 'mark': a.mark, 'sex': a.sex,
        'dob': a.dob, 'cage_id': a.cage_id, 'father': a.father or '',
        'mother': a.mother or '', 'cbz_start': a.cbz_start or '',
        'sacrifice_date': a.sacrifice_date, 'reason': a.reason or ''
    }

@mice_bp.route('/api/mice', methods=['GET', 'POST'])
def handle_mice():
    session = get_session()
    try:
        if request.method == 'POST':
            data = request.json
            if not all([data.get('mouse_id'), data.get('mark'), data.get('sex'),
                        data.get('dob'), data.get('cage_id')]):
                return jsonify({'error': 'Missing required fields'}), 400
            if session.query(Mouse).filter_by(mouse_id=data['mouse_id']).first():
                return jsonify({'error': 'Mouse ID already exists'}), 400
            if session.query(Mouse).filter_by(cage_id=data['cage_id']).count() >= 6:
                return jsonify({'error': 'Cage is full (6 mice max)'}), 400
            if data.get('cbz_start'):
                try:
                    dob = datetime.strptime(data['dob'], '%Y-%m-%d')
                    cbz = datetime.strptime(data['cbz_start'], '%Y-%m-%d')
                    if cbz < dob + timedelta(weeks=6):
                        return jsonify({'error': 'CBZ start must be at least 6 weeks after DOB'}), 400
                except ValueError:
                    pass
            session.add(Mouse(
                mouse_id  = data['mouse_id'], mark = data['mark'],
                sex       = data['sex'],      dob  = data['dob'],
                cage_id   = data['cage_id'],
                father    = data.get('father', ''),
                mother    = data.get('mother', ''),
                cbz_start = data.get('cbz_start', '')
            ))
            session.commit()

        cage_id = request.args.get('cage_id')
        q = session.query(Mouse)
        if cage_id:
            q = q.filter_by(cage_id=cage_id)
        return jsonify([_mouse_dict(m) for m in q.all()])
    finally:
        session.close()


@mice_bp.route('/api/mice/<mouse_id>', methods=['PUT'])
def update_mouse(mouse_id):
    data = request.json
    session = get_session()
    try:
        m = session.query(Mouse).filter_by(mouse_id=mouse_id).first()
        if not m:
            return jsonify({'error': 'Mouse not found'}), 404
        m.mark = data['mark']; m.sex = data['sex']; m.dob = data['dob']
        m.cage_id = data['cage_id']; m.father = data['father']
        m.mother = data['mother']; m.cbz_start = data['cbz_start']
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()


@mice_bp.route('/api/mice/<mouse_id>', methods=['DELETE'])
def delete_mouse(mouse_id):
    session = get_session()
    try:
        session.query(Mouse).filter_by(mouse_id=mouse_id).delete()
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()


@mice_bp.route('/api/mice/sacrificed', methods=['GET'])
def get_sacrificed_mice():
    session = get_session()
    try:
        return jsonify([_archive_dict(a) for a in session.query(Archive).all()])
    finally:
        session.close()


@mice_bp.route('/api/sacrifice', methods=['POST'])
def sacrifice():
    data = request.json
    session = get_session()
    try:
        m = session.query(Mouse).filter_by(mouse_id=data['mouse_id']).first()
        if not m:
            return jsonify({'error': 'Mouse not found'}), 404
        session.add(Archive(
            mouse_id=m.mouse_id, mark=m.mark, sex=m.sex, dob=m.dob,
            cage_id=m.cage_id, father=m.father or '', mother=m.mother or '',
            cbz_start=m.cbz_start or '', sacrifice_date=data['date'],
            reason=data.get('reason', '')
        ))
        session.delete(m)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()


@mice_bp.route('/api/restore', methods=['POST'])
def restore_mouse():
    data = request.json
    session = get_session()
    try:
        archived = session.query(Archive).filter_by(
            mouse_id=data['mouse_id']
        ).order_by(Archive.id.desc()).first()
        if not archived:
            return jsonify({'error': 'Mouse not found in archive'}), 404
        if not session.query(Cage).filter_by(cage_id=archived.cage_id).first():
            return jsonify({'error': f'Original cage {archived.cage_id} no longer exists'}), 400
        if session.query(Mouse).filter_by(cage_id=archived.cage_id).count() >= 6:
            return jsonify({'error': f'Cage {archived.cage_id} is full (6 mice max)'}), 400
        if session.query(Mouse).filter_by(mouse_id=archived.mouse_id).first():
            return jsonify({'error': 'Mouse ID already exists in active mice'}), 400
        session.add(Mouse(
            mouse_id=archived.mouse_id, mark=archived.mark, sex=archived.sex,
            dob=archived.dob, cage_id=archived.cage_id,
            father=archived.father or '', mother=archived.mother or '',
            cbz_start=archived.cbz_start or ''
        ))
        session.delete(archived)
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()
