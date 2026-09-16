"""
Generate RAILFUSE Pitch Script PDF
Run: python generate_pitch_pdf.py
Output: docs/RAILFUSE_Pitch_Script.pdf
"""
from fpdf import FPDF
import os

ORANGE = (249, 115, 22)
WHITE  = (255, 255, 255)
DARK   = (10, 10, 10)
GRAY   = (160, 160, 160)
RED    = (200, 50, 50)
GREEN  = (34, 197, 94)
BLUE   = (59, 130, 246)
SOFT   = (30, 30, 30)

def c(t):
    """Strip em-dashes, en-dashes and middle-dots to ASCII equivalents."""
    return (t.replace('\u2014', '-')
             .replace('\u2013', '-')
             .replace('\u00b7', '.')
             .replace('\u00a0', ' ')
             .replace('\u2018', "'")
             .replace('\u2019', "'")
             .replace('\u201c', '"')
             .replace('\u201d', '"'))


class PitchPDF(FPDF):
    def header(self):
        self.set_fill_color(*DARK)
        self.rect(0, 0, 210, 14, 'F')
        self.set_fill_color(*ORANGE)
        self.rect(0, 14, 210, 1.5, 'F')

        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*ORANGE)
        self.set_xy(8, 3)
        self.cell(80, 8, 'RAILFUSE')
        self.set_font('Helvetica', '', 7.5)
        self.set_text_color(*GRAY)
        self.set_xy(0, 4)
        self.cell(200, 7, c('Smart India Hackathon 2026  |  PS ID: SIH26027  |  Team: Runtime Rebels'), align='R')

    def footer(self):
        self.set_y(-13)
        self.set_fill_color(*DARK)
        self.rect(0, 284, 210, 14, 'F')
        self.set_fill_color(*ORANGE)
        self.rect(0, 284, 210, 0.8, 'F')
        self.set_font('Helvetica', '', 7)
        self.set_text_color(*GRAY)
        self.set_xy(8, 286)
        self.cell(150, 6, 'PROTOTYPE - SYNTHETIC DATA ONLY. Not connected to live Indian Railways systems.')
        self.set_xy(0, 286)
        self.cell(200, 6, f'Page {self.page_no()}', align='R')

    def section_header(self, title, color=ORANGE):
        self.ln(5)
        self.set_fill_color(*color)
        self.rect(8, self.get_y(), 3, 7, 'F')
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*color)
        self.set_x(14)
        self.cell(0, 7, c(title), ln=True)
        self.ln(2)

    def timing_badge(self, text):
        self.set_font('Helvetica', 'B', 7.5)
        self.set_fill_color(*ORANGE)
        self.set_text_color(*DARK)
        self.set_x(14)
        w = self.get_string_width(text) + 6
        self.cell(w, 5.5, text, fill=True, ln=True)
        self.set_text_color(*SOFT)
        self.ln(3)

    def body(self, text, indent=14):
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(*SOFT)
        self.set_x(indent)
        self.multi_cell(182 - indent + 14, 5.5, c(text))
        self.ln(1)

    def bullet(self, text, dot_color=ORANGE, indent=20):
        y = self.get_y() + 2.3
        self.set_fill_color(*dot_color)
        self.rect(indent, y, 2, 2, 'F')
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(*SOFT)
        self.set_x(indent + 5)
        self.multi_cell(175 - indent, 5.5, c(text))
        self.ln(0.5)

    def labeled_bullet(self, label, value, indent=22):
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*ORANGE)
        self.set_x(indent)
        lw = self.get_string_width(c(label)) + 1
        self.cell(lw, 5.5, c(label))
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*SOFT)
        self.multi_cell(175 - indent - lw, 5.5, c(value))
        self.ln(0.5)

    def kv_row(self, key, value):
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*ORANGE)
        self.set_x(14)
        self.cell(60, 6, c(key))
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*SOFT)
        self.multi_cell(125, 6, c(value))

    def divider(self):
        self.ln(3)
        self.set_draw_color(*ORANGE)
        self.set_line_width(0.3)
        self.line(14, self.get_y(), 196, self.get_y())
        self.ln(4)

    def highlight_box(self, text, border_color=ORANGE):
        self.set_fill_color(255, 247, 237)
        self.set_draw_color(*border_color)
        self.set_line_width(0.5)
        self.set_x(14)
        self.set_font('Helvetica', 'I', 10)
        self.set_text_color(*border_color)
        self.multi_cell(182, 7, c(text), border=1, fill=True, align='C')
        self.ln(4)

    def qa_block(self, question, answer):
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*DARK)
        self.set_x(14)
        self.cell(5, 6, 'Q:')
        self.set_text_color(*SOFT)
        self.set_x(20)
        self.multi_cell(176, 6, c(question))
        self.set_font('Helvetica', '', 9)
        self.set_text_color(80, 80, 80)
        self.set_x(20)
        self.cell(5, 5.5, 'A:')
        self.set_x(25)
        self.multi_cell(171, 5.5, c(answer))
        self.ln(3)


def build():
    pdf = PitchPDF(orientation='P', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(0, 18, 0)

    # ====== COVER PAGE ============================================
    pdf.add_page()

    pdf.set_fill_color(*DARK)
    pdf.rect(0, 16, 210, 90, 'F')
    pdf.set_fill_color(*ORANGE)
    pdf.rect(0, 104, 210, 2, 'F')

    pdf.set_font('Helvetica', 'B', 38)
    pdf.set_text_color(*ORANGE)
    pdf.set_xy(0, 32)
    pdf.cell(210, 18, 'RAILFUSE', align='C', ln=True)

    pdf.set_font('Helvetica', '', 13)
    pdf.set_text_color(*WHITE)
    pdf.set_x(0)
    pdf.cell(210, 9, 'Opportunity-Aware Adaptive Block Planning', align='C', ln=True)

    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(*GRAY)
    pdf.set_x(0)
    pdf.cell(210, 7, 'Smart India Hackathon 2026   |   PS ID: SIH26027   |   Team: Runtime Rebels', align='C', ln=True)

    # Stats row
    stats = [('25', 'Tasks'), ('10', 'Blocks'), ('34', 'Trains'), ('103', 'Tests'), ('1 click', 'Replan')]
    col_w = 38
    for i, (val, lbl) in enumerate(stats):
        x = 8 + i * col_w
        pdf.set_fill_color(20, 20, 20)
        pdf.rect(x, 112, col_w - 3, 22, 'F')
        pdf.set_fill_color(*ORANGE)
        pdf.rect(x, 112, col_w - 3, 1, 'F')
        pdf.set_font('Helvetica', 'B', 15)
        pdf.set_text_color(*ORANGE)
        pdf.set_xy(x, 114)
        pdf.cell(col_w - 3, 9, val, align='C')
        pdf.set_font('Helvetica', '', 7)
        pdf.set_text_color(*GRAY)
        pdf.set_xy(x, 123)
        pdf.cell(col_w - 3, 5, lbl, align='C')

    pdf.set_y(142)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(*SOFT)
    pdf.set_x(0)
    pdf.cell(210, 8, '3-MINUTE PITCH SCRIPT  +  JUDGE Q&A', align='C', ln=True)

    pdf.set_font('Helvetica', '', 8.5)
    pdf.set_text_color(*GRAY)
    pdf.set_x(0)
    pdf.cell(210, 6, 'All data is synthetic. Not connected to live Indian Railways systems.', align='C', ln=True)

    # ====== PAGE 2: PROBLEM + SOLUTION ============================
    pdf.add_page()

    pdf.section_header('PART 1 - THE PROBLEM', DARK)
    pdf.timing_badge('0:00 - 0:40')

    pdf.body('Indian Railways runs the world\'s largest rail network under one management '
             '- over 13,000 trains a day, 68,000 km of track.')
    pdf.body('Maintenance teams must work inside "Engineering Blocks" - short windows of 2-4 hours '
             'at night when a section of track is cleared of trains.')
    pdf.body('Today, that scheduling is done manually:')
    pdf.bullet('A maintenance manager looks at a spreadsheet, assigning tasks one by one.')
    pdf.bullet('No real-time visibility into which tasks are overdue or about to expire.')
    pdf.bullet('No awareness of which tasks from two departments could share the same block.')

    pdf.ln(2)
    pdf.body('The result:')
    pdf.bullet('High-debt tasks slip through the cracks and become safety risks.', RED)
    pdf.bullet('Blocks run at 40-50% efficiency when they could reach 80%+.', RED)
    pdf.bullet('Every extra possession taken = one more disruption to passengers.', RED)
    pdf.ln(2)
    pdf.highlight_box(
        '"Can we bring intelligent, explainable automation to this process\n'
        '- without replacing the human decision-maker?"'
    )

    pdf.divider()

    pdf.section_header('PART 2 - OUR SOLUTION')
    pdf.timing_badge('0:40 - 1:45')

    pdf.body('We built RAILFUSE - Opportunity-Aware Adaptive Block Planning.')
    pdf.body('The core idea: every maintenance block is not just a time window - '
             'it is an OPPORTUNITY to fuse multiple tasks from multiple departments into one possession.')
    pdf.body('RAILFUSE runs a 5-step pipeline every time:')

    steps = [
        ('1. MAINTENANCE DEBT SCORING:  ',
         'Score every task by days overdue, times deferred, and safety-criticality. '
         'Tells us WHAT needs to happen most urgently.'),
        ('2. FLEXIBILITY SCORING:  ',
         'Calculate how many future blocks each task can still fit into. '
         'A task with only one future option gets a protection flag. Tells us HOW MUCH TIME is left.'),
        ('3. CONFLICT DETECTION:  ',
         'Before assigning anything: Is there a train in this section within a 10-minute safety buffer? '
         'Are required resources available? Does the task duration fit the block\'s remaining capacity?'),
        ('4. MULTI-DEPT OPPORTUNITY FUSION:  ',
         '[OUR CORE INNOVATION] Build a compatibility graph of which tasks from different departments '
         'can share a block safely. Fuse compatible tasks. One possession. Two departments. Zero extra disruption.'),
        ('5. FULL EXPLAINABILITY:  ',
         'Every task gets a plain-language reason. "SELECTED for BLK003: debt 28.5, fused with T004 (S&T). '
         'DEFERRED: 3 future windows available." No black box. Every decision can be audited.'),
    ]
    for label, desc in steps:
        pdf.labeled_bullet(label, desc)

    # ====== PAGE 3: DIFFERENTIATION ===============================
    pdf.add_page()

    pdf.section_header('PART 3 - HOW WE ARE DIFFERENT', DARK)
    pdf.timing_badge('1:45 - 2:30')

    pdf.body('Existing systems fall into two categories:')

    pdf.set_font('Helvetica', 'B', 9.5)
    pdf.set_text_color(*RED)
    pdf.set_x(14)
    pdf.cell(0, 6, 'CATEGORY A - Manual Scheduling Tools (Spreadsheets, basic IRMS modules)', ln=True)
    for t in ['No scoring, prioritization, or conflict detection.',
              'Cannot combine tasks across departments.',
              'Cannot adapt when a new emergency task arrives.']:
        pdf.bullet(t, RED)

    pdf.ln(2)
    pdf.set_font('Helvetica', 'B', 9.5)
    pdf.set_text_color(*RED)
    pdf.set_x(14)
    pdf.cell(0, 6, 'CATEGORY B - Generic Academic / Commercial Optimizers', ln=True)
    for t in ['Not built for Indian Railways specific constraints.',
              'No maintenance debt or flexibility score concepts.',
              'No multi-department fusion. No explainability.']:
        pdf.bullet(t, RED)

    pdf.ln(4)

    # Comparison table
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_fill_color(*DARK)
    pdf.set_text_color(*ORANGE)
    pdf.set_x(14)
    pdf.cell(110, 7, '  WHAT WE DO DIFFERENTLY', fill=True)
    pdf.set_fill_color(*ORANGE)
    pdf.set_text_color(*DARK)
    pdf.cell(72, 7, '  WHY IT MATTERS', fill=True, ln=True)

    rows = [
        ('Maintenance Debt formula', 'Quantifies urgency - no guessing'),
        ('Flexibility Score + Protection', 'Prevents stranded low-flex tasks'),
        ('Multi-Dept Compatibility Graph', 'Maximizes each possession\'s value'),
        ('Zero-Possession Preference', 'Reduces disruptions to passengers'),
        ('Real-Time Dynamic Replanning', 'Handles emergencies without calls'),
        ('Per-Task Plain-Language Reasons', 'Builds trust with field officers'),
        ('Weekly + Monthly Horizon Views', 'Supports strategic capacity planning'),
        ('103 deterministic tests', 'Verifiable, reproducible behavior'),
    ]
    for i, (left, right) in enumerate(rows):
        bg = (245, 245, 245) if i % 2 == 0 else WHITE
        pdf.set_fill_color(*bg)
        pdf.set_text_color(*SOFT)
        pdf.set_x(14)
        pdf.set_font('Helvetica', '', 9)
        pdf.cell(110, 6.5, '  ' + left, fill=True)
        pdf.set_font('Helvetica', 'I', 9)
        pdf.cell(72, 6.5, '  ' + right, fill=True, ln=True)

    pdf.ln(4)
    pdf.set_font('Helvetica', 'I', 9)
    pdf.set_text_color(80, 80, 80)
    pdf.set_x(14)
    pdf.multi_cell(182, 5.5,
        'We are not claiming to solve a problem no one has studied. Block scheduling, '
        'constraint satisfaction, and explainability are established fields. '
        'RAILFUSE combines them specifically for the Indian Railways maintenance context '
        '- debt-aware scoring, cross-department fusion, and dynamic replanning - '
        'into a single, coherent, demonstrable workflow. That integration is our contribution.')

    pdf.divider()

    pdf.section_header('PART 4 - CLOSE')
    pdf.timing_badge('2:30 - 3:00')

    pdf.body('RAILFUSE is a prototype - all data is synthetic, not live IR data. '
             'But the workflow it demonstrates is real and implementable:')
    pdf.bullet('Clean FastAPI service with 15 endpoints, fully documented.')
    pdf.bullet('Deterministic, transparent, testable optimizer (seed 42, 103 tests).')
    pdf.bullet('Frontend works in any browser - no installation needed.')
    pdf.bullet('Deployable on a divisional server in under an hour, zero external cloud dependencies.')

    pdf.ln(4)
    pdf.highlight_box(
        '"Give every maintenance officer a tool that tells them\n'
        'not just WHAT to schedule - but WHY, and WHAT HAPPENS if they don\'t.\n'
        'That is RAILFUSE."'
    )

    # ====== PAGE 4: NUMBERS + Q&A =================================
    pdf.add_page()

    pdf.section_header('KEY NUMBERS TO MENTION', DARK)

    numbers = [
        ('25',       'Maintenance tasks in the demo dataset'),
        ('10',       'Engineering blocks across 4 corridors'),
        ('34',       'Train movements tracked (Delhi + Bangalore corridors)'),
        ('10 min',   'Safety buffer enforced around all train windows'),
        ('103',      'Automated tests - all passing, all deterministic'),
        ('Seed 42',  'Optimizer is fully reproducible: same input = same output'),
        ('1 click',  'Time to inject an emergency task and get a new full plan'),
        ('4',        'Planning horizons: Block / Daily / Weekly / Monthly'),
        ('0',        'External paid APIs or cloud AI dependencies'),
    ]
    for val, desc in numbers:
        pdf.kv_row(val, desc)

    pdf.divider()

    pdf.section_header('LIKELY JUDGE QUESTIONS - QUICK ANSWERS')

    qas = [
        ('Is this connected to real Indian Railways data?',
         'No. All data is synthetic, purpose-built for this demonstration. '
         'The system is designed to plug into real IRMS data exports with a REST wrapper.'),
        ('How is the optimizer different from a simple greedy algorithm?',
         'It is a multi-pass heuristic: (1) Score all tasks. (2) Check conflicts. '
         '(3) Find compatible dept combinations. (4) Apply zero-possession preference. '
         '(5) Protect low-flexibility tasks for future windows. '
         'A greedy algorithm takes the highest-debt task per block without considering '
         'cross-block impact or future stranding.'),
        ('Why not use a neural network or ML model?',
         'Explainability is a hard requirement for safety-critical infrastructure. '
         'A neural model cannot tell a field officer WHY a task was deferred. '
         'Our rule-based heuristic with transparent scoring can. '
         'We chose correctness and trust over prediction accuracy.'),
        ('What would it take to deploy this at a real division?',
         '(1) A data feed from IRMS/SAP for tasks and blocks. '
         '(2) A REST wrapper around that feed. '
         '(3) This backend deployed on a divisional server. '
         'The frontend runs in any browser - no client install needed.'),
        ('How does this compare to what Railways already uses?',
         'Existing tools are record-keeping systems - they store what was done. '
         'RAILFUSE is a decision-support system - it tells you what to do next and why. '
         'That is a fundamentally different category of tool.'),
        ('Is the optimizer scalable to thousands of tasks?',
         'The current implementation handles SIH demonstration scale. '
         'For production, the heuristic can be parallelized by corridor/division, '
         'and conflict detection can be indexed for O(log n) lookups. '
         'This is a prototype; production engineering would address scale.'),
    ]
    for q, a in qas:
        pdf.qa_block(q, a)

    # Save
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', 'RAILFUSE_Pitch_Script.pdf')
    pdf.output(out)
    print(f'PDF saved -> {out}')


if __name__ == '__main__':
    build()
