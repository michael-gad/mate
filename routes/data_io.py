from flask import Blueprint, request, jsonify, send_file
from database import get_session, Cage, Mouse
import pandas as pd
from io import BytesIO

data_io_bp = Blueprint('data_io', __name__)

@data_io_bp.route('/api/import', methods=['POST'])
def import_data():
    file        = request.files['file']
    import_type = request.form.get('type')
    try:
        df = pd.read_excel(file)
        df.columns = [str(c).strip().lower() for c in df.columns]
        session = get_session()
        try:
            if import_type == 'cages':
                session.query(Mouse).delete()
                session.query(Cage).delete()
                session.flush()
                for _, row in df.iterrows():
                    session.add(Cage(
                        cage_id=str(row['cage id']), cage_name=str(row.get('cage name', '')),
                        cage_type=str(row.get('cage type', '')), open_date=str(row.get('open date', '')),
                        row=int(row['row']), col=int(row['col'])
                    ))

            elif import_type == 'mice':
                existing_cages = {c.cage_id for c in session.query(Cage).all()}
                session.query(Mouse).delete()
                session.flush()
                for _, row in df.iterrows():
                    cage_id = str(row['cage id'])
                    if cage_id not in existing_cages:
                        return jsonify({'error': f'Mouse {row["mouse id"]} assigned to non-existent cage {cage_id}'}), 400
                    session.add(Mouse(
                        mouse_id=str(row['mouse id']), mark=str(row.get('mark', '')),
                        sex=str(row.get('sex', '')), dob=str(row.get('date of birth', '')),
                        cage_id=cage_id, father=str(row.get('father', '')),
                        mother=str(row.get('mother', '')), cbz_start=str(row.get('cbz start', ''))
                    ))

            session.commit()
            return jsonify({'success': True})
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@data_io_bp.route('/api/export/<table>')
def export_data(table):
    allowed = {'cages', 'mice', 'archive', 'weights', 'litters', 'experiments', 'preg_weights'}
    if table not in allowed:
        return jsonify({'error': 'Invalid table'}), 400
    from database import engine
    df = pd.read_sql_table(table, engine)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    output.seek(0)
    return send_file(output, as_attachment=True, download_name=f'{table}_export.xlsx')
