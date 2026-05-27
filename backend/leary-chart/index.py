"""
Генерация дискограммы Т. Лири по методике ДМО.
Принимает JSON с баллами по 8 октантам для Я-реального и Я-идеального.
Возвращает PNG или PDF в base64.
"""

import json
import base64
import io
import os
import math

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from matplotlib.patches import FancyBboxPatch
from matplotlib import font_manager


OCTANT_LABELS = [
    'I\nВластный',
    'II\nЭгоист.',
    'III\nАгресс.',
    'IV\nПодозр.',
    'V\nПокорн.',
    'VI\nЗавис.',
    'VII\nДружел.',
    'VIII\nАльтр.',
]

OCTANT_SHORT = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
OCTANT_NAMES = ['Властный', 'Эгоист.', 'Агресс.', 'Подозр.', 'Покорн.', 'Завис.', 'Дружел.', 'Альтр.']

COLOR_REAL   = '#4F8EF7'
COLOR_IDEAL  = '#F7567C'
COLOR_BG     = '#F8F9FF'
COLOR_ZONE1  = '#EEF4FF'
COLOR_ZONE2  = '#D6E8FF'
COLOR_ZONE3  = '#B8D4FF'
COLOR_GRID   = '#C8D8F0'
COLOR_TEXT   = '#1A2340'
COLOR_MUTED  = '#7A8BAE'


def validate_input(data: dict) -> tuple[bool, str]:
    required = ['real', 'ideal']
    for field in required:
        if field not in data:
            return False, f"Отсутствует поле: {field}"
        if not isinstance(data[field], list) or len(data[field]) != 8:
            return False, f"Поле '{field}' должно быть списком из 8 чисел"
        for i, val in enumerate(data[field]):
            if not isinstance(val, (int, float)) or not (0 <= val <= 16):
                return False, f"Значение {val} в '{field}[{i}]' вне диапазона 0–16"
    return True, ""


def draw_diskogram(data: dict, fmt: str = 'png') -> bytes:
    real  = data['real']
    ideal = data['ideal']
    name  = data.get('name', '')
    client = data.get('client', '')
    date   = data.get('date', '')
    title_text = data.get('title', 'Дискограмма ДМО (Т. Лири)')

    n = 8
    max_val = 16
    angles = np.linspace(np.pi / 2, np.pi / 2 + 2 * np.pi, n, endpoint=False)
    # clockwise: reverse
    angles = angles[::-1]

    def to_xy(values, scale=1.0):
        xs, ys = [], []
        for i, v in enumerate(values):
            r = (v / max_val) * scale
            xs.append(r * np.cos(angles[i]))
            ys.append(r * np.sin(angles[i]))
        xs.append(xs[0])
        ys.append(ys[0])
        return xs, ys

    fig = plt.figure(figsize=(14, 9), facecolor=COLOR_BG)
    fig.patch.set_facecolor(COLOR_BG)

    # --- Left: polar chart ---
    ax = fig.add_axes([0.03, 0.08, 0.60, 0.82])
    ax.set_aspect('equal')
    ax.set_facecolor(COLOR_BG)
    ax.axis('off')

    # Zone backgrounds
    t = np.linspace(0, 2 * np.pi, 300)
    radii_zones = [4/max_val, 8/max_val, 12/max_val, 1.0]
    zone_colors = [COLOR_ZONE1, COLOR_ZONE2, COLOR_ZONE3, '#9BBFEE']
    for r, c in zip(reversed(radii_zones), reversed(zone_colors)):
        circle = plt.Circle((0, 0), r, color=c, zorder=1)
        ax.add_patch(circle)

    # Grid rings with labels
    for r_val in [4, 8, 12, 16]:
        r = r_val / max_val
        circle = plt.Circle((0, 0), r, fill=False, color=COLOR_GRID, linewidth=0.8, zorder=2)
        ax.add_patch(circle)
        ax.text(0.02, r + 0.01, str(r_val), fontsize=7, color=COLOR_MUTED,
                ha='left', va='bottom', zorder=5)

    # Center dot
    ax.plot(0, 0, 'o', color=COLOR_GRID, markersize=3, zorder=3)

    # Sector lines
    for ang in angles:
        ax.plot([0, 1.08 * np.cos(ang)], [0, 1.08 * np.sin(ang)],
                color=COLOR_GRID, linewidth=0.8, zorder=2)

    # Labels around
    label_r = 1.18
    for i, (ang, lbl) in enumerate(zip(angles, OCTANT_LABELS)):
        ax.text(label_r * np.cos(ang), label_r * np.sin(ang),
                lbl, ha='center', va='center', fontsize=8,
                color=COLOR_TEXT, fontweight='600', zorder=6,
                multialignment='center')

    # Ideal polygon
    xi, yi = to_xy(ideal)
    ax.fill(xi, yi, color=COLOR_IDEAL, alpha=0.18, zorder=4)
    ax.plot(xi, yi, color=COLOR_IDEAL, linewidth=2.2, zorder=5,
            solid_capstyle='round', solid_joinstyle='round')
    for i, (x, y) in enumerate(zip(xi[:-1], yi[:-1])):
        ax.plot(x, y, 'o', color=COLOR_IDEAL, markersize=6,
                markeredgecolor='white', markeredgewidth=1.5, zorder=6)

    # Real polygon
    xr, yr = to_xy(real)
    ax.fill(xr, yr, color=COLOR_REAL, alpha=0.22, zorder=4)
    ax.plot(xr, yr, color=COLOR_REAL, linewidth=2.5, zorder=5,
            solid_capstyle='round', solid_joinstyle='round')
    for i, (x, y) in enumerate(zip(xr[:-1], yr[:-1])):
        ax.plot(x, y, 'o', color=COLOR_REAL, markersize=7,
                markeredgecolor='white', markeredgewidth=1.5, zorder=6)

    ax.set_xlim(-1.38, 1.38)
    ax.set_ylim(-1.38, 1.38)

    # --- Right panel ---
    ax2 = fig.add_axes([0.65, 0.08, 0.32, 0.82])
    ax2.set_facecolor('white')
    ax2.axis('off')

    # Panel background with rounded appearance via rectangle
    panel_bg = FancyBboxPatch((0, 0), 1, 1,
                               boxstyle="round,pad=0.02",
                               facecolor='white',
                               edgecolor='#D6E4F7',
                               linewidth=1.5,
                               transform=ax2.transAxes, zorder=0)
    ax2.add_patch(panel_bg)

    # Title
    ax2.text(0.5, 0.97, title_text, ha='center', va='top',
             fontsize=10, fontweight='700', color=COLOR_TEXT,
             transform=ax2.transAxes, wrap=True)

    if name:
        ax2.text(0.5, 0.91, name, ha='center', va='top',
                 fontsize=9, color=COLOR_MUTED, transform=ax2.transAxes)
    if client:
        ax2.text(0.5, 0.86, f'Исп.: {client}', ha='center', va='top',
                 fontsize=8, color=COLOR_MUTED, transform=ax2.transAxes)
    if date:
        ax2.text(0.5, 0.82, date, ha='center', va='top',
                 fontsize=8, color=COLOR_MUTED, transform=ax2.transAxes)

    # Divider
    ax2.plot([0.05, 0.95], [0.79, 0.79], color='#D6E4F7', linewidth=1,
             transform=ax2.transAxes)

    # Table header
    col_x = [0.08, 0.42, 0.65, 0.88]
    row_start = 0.74
    row_step = 0.065

    header_bg = FancyBboxPatch((0.03, row_start - 0.01), 0.94, row_step,
                                boxstyle="round,pad=0.005",
                                facecolor='#EEF4FF', edgecolor='none',
                                transform=ax2.transAxes, zorder=1)
    ax2.add_patch(header_bg)

    headers = ['Октант', 'Назв.', 'Реал.', 'Идеал.']
    for x, h in zip(col_x, headers):
        ax2.text(x, row_start + row_step * 0.45, h,
                 ha='left', va='center', fontsize=7.5,
                 fontweight='700', color=COLOR_TEXT,
                 transform=ax2.transAxes)

    for i in range(8):
        y = row_start - (i + 1) * row_step
        if i % 2 == 0:
            row_bg = FancyBboxPatch((0.03, y - 0.005), 0.94, row_step,
                                     boxstyle="round,pad=0.002",
                                     facecolor='#F8F9FF', edgecolor='none',
                                     transform=ax2.transAxes, zorder=1)
            ax2.add_patch(row_bg)

        ax2.text(col_x[0], y + row_step * 0.4, OCTANT_SHORT[i],
                 ha='left', va='center', fontsize=8, fontweight='600',
                 color=COLOR_TEXT, transform=ax2.transAxes)
        ax2.text(col_x[1], y + row_step * 0.4, OCTANT_NAMES[i],
                 ha='left', va='center', fontsize=7.5, color=COLOR_MUTED,
                 transform=ax2.transAxes)

        r_val = real[i]
        i_val = ideal[i]

        # Real value with color pill
        r_pill = FancyBboxPatch((col_x[2] - 0.02, y + 0.005), 0.18, row_step * 0.75,
                                 boxstyle="round,pad=0.01",
                                 facecolor=COLOR_REAL + '30', edgecolor=COLOR_REAL,
                                 linewidth=0.8, transform=ax2.transAxes, zorder=2)
        ax2.add_patch(r_pill)
        ax2.text(col_x[2] + 0.07, y + row_step * 0.42, str(r_val),
                 ha='center', va='center', fontsize=8, fontweight='700',
                 color=COLOR_REAL, transform=ax2.transAxes)

        # Ideal value with color pill
        i_pill = FancyBboxPatch((col_x[3] - 0.02, y + 0.005), 0.18, row_step * 0.75,
                                 boxstyle="round,pad=0.01",
                                 facecolor=COLOR_IDEAL + '30', edgecolor=COLOR_IDEAL,
                                 linewidth=0.8, transform=ax2.transAxes, zorder=2)
        ax2.add_patch(i_pill)
        ax2.text(col_x[3] + 0.07, y + row_step * 0.42, str(i_val),
                 ha='center', va='center', fontsize=8, fontweight='700',
                 color=COLOR_IDEAL, transform=ax2.transAxes)

    # Legend
    legend_y = row_start - 9 * row_step - 0.03
    ax2.plot([0.05, 0.95], [legend_y + 0.045, legend_y + 0.045],
             color='#D6E4F7', linewidth=1, transform=ax2.transAxes)

    dot_r = plt.Line2D([0], [0], marker='o', color='w', markerfacecolor=COLOR_REAL,
                        markersize=8, label='Я-реальное')
    dot_i = plt.Line2D([0], [0], marker='o', color='w', markerfacecolor=COLOR_IDEAL,
                        markersize=8, label='Я-идеальное')

    ax2.text(0.1, legend_y + 0.028, '●', color=COLOR_REAL, fontsize=12,
             transform=ax2.transAxes, va='center')
    ax2.text(0.2, legend_y + 0.028, 'Я-реальное', fontsize=8, color=COLOR_TEXT,
             transform=ax2.transAxes, va='center')
    ax2.text(0.55, legend_y + 0.028, '●', color=COLOR_IDEAL, fontsize=12,
             transform=ax2.transAxes, va='center')
    ax2.text(0.65, legend_y + 0.028, 'Я-идеальное', fontsize=8, color=COLOR_TEXT,
             transform=ax2.transAxes, va='center')

    # Zone legend
    zone_info = [
        ('#B8D4FF', '0–4: низкий'),
        ('#D6E8FF', '5–8: средний'),
        ('#EEF4FF', '9–12: высокий'),
        ('#9BBFEE', '13–16: патол.'),
    ]
    for idx, (zc, zt) in enumerate(zone_info):
        ax2.add_patch(FancyBboxPatch((0.05 + idx * 0.24, legend_y - 0.04), 0.19, 0.025,
                                      boxstyle="round,pad=0.002",
                                      facecolor=zc, edgecolor='#C8D8F0', linewidth=0.5,
                                      transform=ax2.transAxes, zorder=2))
        ax2.text(0.145 + idx * 0.24, legend_y - 0.027, zt,
                 ha='center', va='center', fontsize=6.2, color=COLOR_TEXT,
                 transform=ax2.transAxes)

    # Main chart title (outside axes)
    fig.text(0.34, 0.975, title_text,
             ha='center', va='top', fontsize=13, fontweight='800',
             color=COLOR_TEXT)

    buf = io.BytesIO()
    dpi = 180 if fmt == 'png' else 150
    if fmt == 'pdf':
        from matplotlib.backends.backend_pdf import PdfPages
        with PdfPages(buf) as pdf:
            pdf.savefig(fig, bbox_inches='tight', facecolor=COLOR_BG)
    else:
        fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight',
                    facecolor=COLOR_BG, edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def handler(event: dict, context) -> dict:
    """Генерация дискограммы Т. Лири. POST JSON → PNG или PDF base64."""

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': cors,
                'body': json.dumps({'error': 'Только POST'})}

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        return {'statusCode': 400, 'headers': cors,
                'body': json.dumps({'error': 'Невалидный JSON'})}

    ok, msg = validate_input(body)
    if not ok:
        return {'statusCode': 422, 'headers': cors,
                'body': json.dumps({'error': msg})}

    fmt = body.get('format', 'png').lower()
    if fmt not in ('png', 'pdf'):
        fmt = 'png'

    img_bytes = draw_diskogram(body, fmt=fmt)
    img_b64 = base64.b64encode(img_bytes).decode('utf-8')

    mime = 'image/png' if fmt == 'png' else 'application/pdf'

    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'body': json.dumps({
            'format': fmt,
            'mime': mime,
            'data': img_b64,
        })
    }