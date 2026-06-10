from flask import Blueprint, request, jsonify
from database import get_session, Cage, Mouse

cages_bp = Blueprint('cages', __name__)

@cages_bp.route('/api/cages', methods=['GET', 'POST'])
def handle_cages():
    session = get_session()
    try:
        if request.method == 'POST':
            data = request.json
            # בדיקת תפוסת מיקום
            existing = session.query(Cage).filter(
                Cage.row == data['row'],
                Cage.col == data['col'],
                Cage.cage_id != data['cage_id']
            ).first()
            if existing:
                return jsonify({'error': f'Position occupied by cage {existing.cage_id}'}), 400

            cage = session.query(Cage).filter_by(cage_id=data['cage_id']).first()
            if cage:
                cage.cage_name = data['cage_name']
                cage.cage_type = data['cage_type']
                cage.open_date = data['open_date']
                cage.row       = int(data['row'])
                cage.col       = int(data['col'])
            else:
                session.add(Cage(
                    cage_id   = data['cage_id'],
                    cage_name = data['cage_name'],
                    cage_type = data['cage_type'],
                    open_date = data['open_date'],
                    row       = int(data['row']),
                    col       = int(data['col'])
                ))
            session.commit()

        cages = session.query(Cage).all()
        return jsonify([{
            'cage_id': c.cage_id, 'cage_name': c.cage_name, 'cage_type': c.cage_type,
            'open_date': c.open_date, 'row': c.row, 'col': c.col
        } for c in cages])
    finally:
        session.close()


@cages_bp.route('/api/cages/<id>', methods=['DELETE'])
def delete_cage(id):
    session = get_session()
    try:
        count = session.query(Mouse).filter_by(cage_id=id).count()
        if count > 0:
            return jsonify({'error': 'Cannot delete a cage that is not empty'}), 400
        session.query(Cage).filter_by(cage_id=id).delete()
        session.commit()
        return jsonify({'success': True})
    finally:
        session.close()
