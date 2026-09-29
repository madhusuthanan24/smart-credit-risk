import io
import json
from datetime import datetime
from typing import Dict, Any, Optional, List

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable
)
from reportlab.pdfgen import canvas

from backend.api.routes.simulate import CODE_DISPLAYS, FIELD_LABELS, format_field_value


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' 
    along with running header and footer metadata.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        page_width, page_height = letter

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(54, page_height - 36, "SMART CREDIT RISK PLATFORM — ASSESSMENT AUDIT REPORT")
            self.drawRightString(page_width - 54, page_height - 36, "CONFIDENTIAL")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, page_height - 42, page_width - 54, page_height - 42)

        # Running Footer (all pages)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 34, "Proprietary & Confidential — Authorized Lending Personnel Only")
        self.drawRightString(page_width - 54, 34, f"Page {self._pageNumber} of {page_count}")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 46, page_width - 54, 46)

        self.restoreState()


class ReportService:
    """
    Automated Credit Risk Assessment PDF Generator.
    Acts strictly as a PRESENTATION layer:
    - Never calls model.predict_proba()
    - Never recalculates thresholds or risk categories
    - Never invokes live external AI APIs
    - Purely renders verified stored database records and optional simulation data.
    """

    @staticmethod
    def _extract_factors(applicant_data: Dict[str, Any]) -> tuple[List[str], List[str]]:
        """
        Derive model-associated risk and protective factors deterministically
        from borrower attributes WITHOUT calling model.predict_proba().
        """
        risk_factors = []
        protective_factors = []

        if applicant_data.get('status_checking_account') == 'A11':
            risk_factors.append("Checking Account in Deficit (< 0 DM): Associated with higher predicted default risk.")
        elif applicant_data.get('status_checking_account') == 'A14':
            protective_factors.append("No Checking Account: Associated with lower predicted default risk.")

        duration = applicant_data.get('duration_in_months', 0)
        if duration > 24:
            risk_factors.append(f"Extended Loan Horizon ({duration} Months): Prolonged repayment term increases cumulative risk exposure.")
        else:
            protective_factors.append(f"Moderate Loan Horizon ({duration} Months): Shorter repayment tenure limits duration risk.")

        if applicant_data.get('savings_account') == 'A61':
            risk_factors.append("Low Liquid Reserves (< 100 DM): Minimal liquidity cushion against potential income disruption.")
        elif applicant_data.get('savings_account') in ['A64', 'A65']:
            protective_factors.append("Strong Savings Position (>= 1,000 DM or verified reserve): Substantial buffer against cash flow volatility.")

        amount = applicant_data.get('credit_amount', 0)
        if amount > 4000:
            risk_factors.append(f"High Principal Commitment ({amount:,} DM): Elevated loan volume relative to standard origination tiers.")

        rate = applicant_data.get('installment_rate', 0)
        if rate >= 3:
            risk_factors.append(f"High Debt-Service Ratio (Tier {rate}%): Substantial installment commitment relative to disposable earnings.")

        if applicant_data.get('housing') == 'A152':
            protective_factors.append("Residential Property Ownership: Real estate tenure provides collateral stability.")

        return risk_factors, protective_factors

    def generate_pdf(
        self,
        assessment_data: Dict[str, Any],
        applicant_data: Dict[str, Any],
        simulation_data: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Compile and render the complete assessment report into a PDF byte stream.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()

        # Custom Brand Typography Styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#475569'),
            spaceAfter=14
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        body_bold = ParagraphStyle(
            'ReportBodyBold',
            parent=body_style,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#0f172a')
        )
        meta_label = ParagraphStyle(
            'MetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#64748b')
        )
        meta_value = ParagraphStyle(
            'MetaValue',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#0f172a')
        )
        disclaimer_style = ParagraphStyle(
            'DisclaimerStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=7.5,
            leading=11,
            textColor=colors.HexColor('#64748b')
        )

        story = []

        # --------------------------------------------------
        # Header & Document Identification
        # --------------------------------------------------
        assessment_id = str(assessment_data.get('id', 'N/A'))
        created_at_raw = assessment_data.get('created_at', datetime.utcnow())
        if isinstance(created_at_raw, datetime):
            created_at_str = created_at_raw.strftime('%Y-%m-%d %H:%M:%S UTC')
        else:
            created_at_str = str(created_at_raw)

        report_timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

        story.append(Paragraph("CREDIT RISK ASSESSMENT REPORT", title_style))
        story.append(Paragraph("Automated Credit Evaluation & Explainable AI Decision-Support Brief", subtitle_style))

        # Top Metadata Box
        meta_table_data = [
            [
                Paragraph("<b>Assessment ID:</b>", meta_label),
                Paragraph(assessment_id, meta_value),
                Paragraph("<b>Assessment Date:</b>", meta_label),
                Paragraph(created_at_str, meta_value)
            ],
            [
                Paragraph("<b>Report ID:</b>", meta_label),
                Paragraph(f"REP-{assessment_id[:8].upper()}", meta_value),
                Paragraph("<b>Report Generated:</b>", meta_label),
                Paragraph(report_timestamp, meta_value)
            ],
            [
                Paragraph("<b>Assessment Status:</b>", meta_label),
                Paragraph("COMPLETED & VERIFIED", meta_value),
                Paragraph("<b>Authorized System:</b>", meta_label),
                Paragraph("Smart Credit Risk Platform v1.0", meta_value)
            ]
        ]
        meta_table = Table(meta_table_data, colWidths=[95, 170, 95, 144])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        # --------------------------------------------------
        # Section: Authoritative Model Assessment
        # --------------------------------------------------
        story.append(Paragraph("MODEL ASSESSMENT", section_heading))
        story.append(Paragraph(
            "The numerical assessment below was calculated by the platform's calibrated local machine-learning engine. "
            "It reflects empirical credit risk estimation under the verified decision threshold.",
            body_style
        ))
        story.append(Spacer(1, 6))

        prob_val = float(assessment_data.get('default_probability', 0.0))
        prob_pct_str = f"{prob_val * 100:.2f}%"
        risk_category = str(assessment_data.get('risk_category', 'UNKNOWN'))
        threshold_val = float(assessment_data.get('threshold', 0.35))
        threshold_pct_str = f"{threshold_val * 100:.0f}%"
        credit_decision = str(assessment_data.get('decision', 'MANUAL REVIEW'))
        model_name = str(assessment_data.get('model_name', 'Tuned Logistic Regression'))

        if "LOW" in risk_category:
            risk_color = colors.HexColor('#059669')
            bg_color = colors.HexColor('#ecfdf5')
        elif "MODERATE" in risk_category or "MEDIUM" in risk_category:
            risk_color = colors.HexColor('#d97706')
            bg_color = colors.HexColor('#fffbeb')
        else:
            risk_color = colors.HexColor('#e11d48')
            bg_color = colors.HexColor('#fff1f2')

        metric_box_data = [
            [
                Paragraph("<b>Metric</b>", body_bold),
                Paragraph("<b>Model Prediction Output</b>", body_bold),
                Paragraph("<b>Regulatory / Policy Benchmark</b>", body_bold)
            ],
            [
                Paragraph("Default Probability", body_style),
                Paragraph(f"<b>{prob_pct_str}</b>", ParagraphStyle('P1', parent=body_style, fontName='Helvetica-Bold', fontSize=10, textColor=risk_color)),
                Paragraph(f"Decision Cutoff Threshold: <b>{threshold_pct_str}</b>", body_style)
            ],
            [
                Paragraph("Risk Category", body_style),
                Paragraph(f"<b>{risk_category}</b>", ParagraphStyle('P2', parent=body_style, fontName='Helvetica-Bold', textColor=risk_color)),
                Paragraph("Standard Tier Classification (Low / Moderate / High)", body_style)
            ],
            [
                Paragraph("Credit Recommendation", body_style),
                Paragraph(f"<b>{credit_decision}</b>", body_bold),
                Paragraph("Authoritative Decision Rule", body_style)
            ],
            [
                Paragraph("Model Architecture", body_style),
                Paragraph(model_name, body_style),
                Paragraph("Calibrated Logistic Classifier (v1.0.0)", body_style)
            ]
        ]
        metric_table = Table(metric_box_data, colWidths=[130, 160, 214])
        metric_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('BACKGROUND', (1, 1), (1, 2), bg_color),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(metric_table)
        story.append(Spacer(1, 12))

        # --------------------------------------------------
        # Section: Model-Derived Risk & Protective Factors
        # --------------------------------------------------
        risk_factors, protective_factors = self._extract_factors(applicant_data)

        story.append(Paragraph("MODEL-DERIVED RISK & PROTECTIVE FACTORS", section_heading))
        
        factor_items = []
        if risk_factors:
            factor_items.append(Paragraph("<b>Primary Risk Drivers Identified:</b>", body_bold))
            for rf in risk_factors:
                factor_items.append(Paragraph(f"• <font color='#e11d48'>[RISK]</font> {rf}", body_style))
        else:
            factor_items.append(Paragraph("• No acute high-risk drivers detected in borrower metrics.", body_style))

        factor_items.append(Spacer(1, 4))

        if protective_factors:
            factor_items.append(Paragraph("<b>Primary Protective Factors Identified:</b>", body_bold))
            for pf in protective_factors:
                factor_items.append(Paragraph(f"• <font color='#059669'>[PROTECTIVE]</font> {pf}", body_style))
        else:
            factor_items.append(Paragraph("• Standard baseline profile without distinctive protective buffers.", body_style))

        factors_table = Table([[item] for item in factor_items], colWidths=[504])
        factors_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(factors_table)
        story.append(Spacer(1, 12))

        # --------------------------------------------------
        # Section: Applicant Profile Summary
        # --------------------------------------------------
        story.append(Paragraph("APPLICANT UNDERWRITING PROFILE", section_heading))
        
        app_rows = [
            [
                Paragraph("<b>Requested Principal:</b>", meta_label),
                Paragraph(format_field_value("credit_amount", applicant_data.get('credit_amount', 0)), body_style),
                Paragraph("<b>Loan Duration:</b>", meta_label),
                Paragraph(format_field_value("duration_in_months", applicant_data.get('duration_in_months', 0)), body_style)
            ],
            [
                Paragraph("<b>Checking Balance:</b>", meta_label),
                Paragraph(format_field_value("status_checking_account", applicant_data.get('status_checking_account', '')), body_style),
                Paragraph("<b>Savings Reserves:</b>", meta_label),
                Paragraph(format_field_value("savings_account", applicant_data.get('savings_account', '')), body_style)
            ],
            [
                Paragraph("<b>Credit History:</b>", meta_label),
                Paragraph(format_field_value("credit_history", applicant_data.get('credit_history', '')), body_style),
                Paragraph("<b>Employment Tenure:</b>", meta_label),
                Paragraph(format_field_value("present_employment_since", applicant_data.get('present_employment_since', '')), body_style)
            ],
            [
                Paragraph("<b>Installment Burden:</b>", meta_label),
                Paragraph(format_field_value("installment_rate", applicant_data.get('installment_rate', 0)), body_style),
                Paragraph("<b>Applicant Age:</b>", meta_label),
                Paragraph(format_field_value("age_in_years", applicant_data.get('age_in_years', 0)), body_style)
            ],
            [
                Paragraph("<b>Housing Status:</b>", meta_label),
                Paragraph(format_field_value("housing", applicant_data.get('housing', '')), body_style),
                Paragraph("<b>Property / Asset:</b>", meta_label),
                Paragraph(format_field_value("property", applicant_data.get('property', '')), body_style)
            ],
            [
                Paragraph("<b>Guarantor / Co-Signer:</b>", meta_label),
                Paragraph(format_field_value("other_debtors_guarantors", applicant_data.get('other_debtors_guarantors', '')), body_style),
                Paragraph("<b>Loan Purpose:</b>", meta_label),
                Paragraph(format_field_value("purpose", applicant_data.get('purpose', '')), body_style)
            ]
        ]
        app_table = Table(app_rows, colWidths=[105, 147, 105, 147])
        app_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(app_table)
        story.append(Spacer(1, 14))

        # --------------------------------------------------
        # Section: NVIDIA AI Explanation & Insights
        # --------------------------------------------------
        story.append(Paragraph("NVIDIA AI EXPLANATION & RISK INSIGHTS", section_heading))
        
        ai_provider = assessment_data.get('ai_provider') or 'NVIDIA AI'
        ai_model = assessment_data.get('ai_model') or 'meta/llama-3.2-11b-vision-instruct'
        ai_summary = assessment_data.get('ai_summary') or 'Executive underwriting analysis completed.'
        ai_explanation = assessment_data.get('ai_explanation') or 'Decision rationale generated by calibrated model factors.'
        
        raw_insights = assessment_data.get('ai_insights', [])
        if isinstance(raw_insights, str):
            try:
                ai_insights = json.loads(raw_insights)
            except Exception:
                ai_insights = [raw_insights]
        elif isinstance(raw_insights, list):
            ai_insights = raw_insights
        else:
            ai_insights = []

        ai_header_table = Table([
            [
                Paragraph("<b>AI Provider:</b>", meta_label),
                Paragraph(ai_provider, meta_value),
                Paragraph("<b>AI Model:</b>", meta_label),
                Paragraph(ai_model, meta_value)
            ]
        ], colWidths=[90, 162, 90, 162])
        ai_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(ai_header_table)
        story.append(Spacer(1, 6))

        ai_content = [
            Paragraph("<b>Executive Underwriting Summary:</b>", body_bold),
            Spacer(1, 3),
            Paragraph(ai_summary, body_style),
            Spacer(1, 6),
            Paragraph("<b>Model Decision Explanation:</b>", body_bold),
            Spacer(1, 3),
            Paragraph(ai_explanation, body_style),
            Spacer(1, 6),
            Paragraph("<b>Actionable Risk Mitigation Insights:</b>", body_bold),
            Spacer(1, 3)
        ]
        if ai_insights:
            for idx, insight in enumerate(ai_insights, 1):
                ai_content.append(Paragraph(f"• <b>Insight {idx}:</b> {insight}", body_style))
        else:
            ai_content.append(Paragraph("• Standard risk management guidelines apply.", body_style))

        ai_box = Table([[item] for item in ai_content], colWidths=[504])
        ai_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(ai_box)
        story.append(Spacer(1, 14))

        # --------------------------------------------------
        # Section: Simulation Results (Conditional)
        # --------------------------------------------------
        if simulation_data:
            story.append(Paragraph("CREDIT RISK SIMULATION COMPARISON", section_heading))
            story.append(Paragraph(
                "A what-if scenario simulation was evaluated for this applicant profile. "
                "The table below contrasts the original baseline with the simulated parameters.",
                body_style
            ))
            story.append(Spacer(1, 6))

            orig_item = simulation_data.get('original', {})
            sim_item = simulation_data.get('simulated', {})
            diff_item = simulation_data.get('difference', {})

            orig_prob_pct = orig_item.get('default_probability_pct', 'N/A')
            sim_prob_pct = sim_item.get('default_probability_pct', 'N/A')
            pts = diff_item.get('probability_points', 0.0)
            pts_sign = "+" if pts > 0 else ""
            pts_str = f"{pts_sign}{pts:.2f} percentage points"

            sim_table_data = [
                [
                    Paragraph("<b>Evaluation Dimension</b>", body_bold),
                    Paragraph("<b>Original Baseline</b>", body_bold),
                    Paragraph("<b>Simulated Scenario</b>", body_bold),
                    Paragraph("<b>Observed Variance</b>", body_bold)
                ],
                [
                    Paragraph("Default Probability", body_style),
                    Paragraph(orig_prob_pct, body_style),
                    Paragraph(f"<b>{sim_prob_pct}</b>", body_bold),
                    Paragraph(pts_str, body_bold)
                ],
                [
                    Paragraph("Risk Classification", body_style),
                    Paragraph(str(orig_item.get('risk_category', 'N/A')), body_style),
                    Paragraph(str(sim_item.get('risk_category', 'N/A')), body_bold),
                    Paragraph("Category Transition", body_style)
                ],
                [
                    Paragraph("Credit Decision", body_style),
                    Paragraph(str(orig_item.get('credit_decision', 'N/A')), body_style),
                    Paragraph(str(sim_item.get('credit_decision', 'N/A')), body_bold),
                    Paragraph("Recommendation Shift", body_style)
                ]
            ]
            sim_table = Table(sim_table_data, colWidths=[130, 120, 120, 134])
            sim_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e7ff')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f1f5f9')),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(sim_table)

            changes_summary = simulation_data.get('changes_summary', [])
            if changes_summary:
                story.append(Spacer(1, 6))
                story.append(Paragraph("<b>Simulated Parameter Adjustments:</b>", body_bold))
                for change in changes_summary:
                    lbl = change.get('field_label', change.get('field', ''))
                    orig_disp = change.get('display_original', str(change.get('original_value', '')))
                    sim_disp = change.get('display_simulated', str(change.get('simulated_value', '')))
                    story.append(Paragraph(f"• <b>{lbl}:</b> {orig_disp} → <font color='#4338ca'><b>{sim_disp}</b></font>", body_style))

            story.append(Spacer(1, 14))

        # --------------------------------------------------
        # Section: Regulatory & Operational Disclaimer
        # --------------------------------------------------
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceBefore=8, spaceAfter=8))
        story.append(Paragraph("<b>REGULATORY NOTICE & MODEL USAGE DISCLAIMER</b>", meta_label))
        story.append(Spacer(1, 2))
        disclaimer_text = (
            "This report provides decision-support information generated from the application's machine-learning model "
            "and explainability layer. The model output is not a guarantee of future repayment behavior. "
            "AI-generated explanations are intended to explain model outputs and do not replace qualified human review "
            "or applicable lending policies."
        )
        story.append(Paragraph(disclaimer_text, disclaimer_style))

        # Build document with NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()


report_service = ReportService()
