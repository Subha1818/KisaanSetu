import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabaseClient';

export const generateProcurementReceipt = async (procurementId: string) => {
  try {
    // Fetch the full relational data
    const { data: procurement, error } = await supabase
      .from('procurements')
      .select(`
        *,
        bookings (
          token,
          product_name,
          booking_dates ( date ),
          users ( name, mobile_number ),
          procurement_centres ( 
            name, 
            geo_blocks (
              district_name,
              block_name,
              state_name
            ) 
          )
        ),
        payments ( status )
      `)
      .eq('id', procurementId)
      .single();

    if (error || !procurement) {
      throw new Error(error?.message || 'Failed to fetch procurement details');
    }

    const booking = procurement.bookings as any;
    const centre = booking.procurement_centres;
    const farmer = booking.users;
    const payment = procurement.payments?.[0];
    const geo = centre.geo_blocks || {};

    // Initialize PDF
    const doc = new jsPDF();
    
    // Config
    const margin = 20;
    let yPos = margin;
    const pageWidth = doc.internal.pageSize.width;

    // Helper for adding text
    const addLine = (text: string, x: number, yOffset: number, size = 12, isBold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(text, x, yPos + yOffset);
      return yOffset + (size * 0.5); // return approximate height
    };

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('AgriProcure', margin, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Official Procurement Receipt', margin, yPos);
    
    // Right side Header (Centre Info)
    doc.setFontSize(10);
    doc.text(centre.name || 'Procurement Centre', pageWidth - margin, yPos - 10, { align: 'right' });
    const locationStr = [geo.block_name, geo.district_name].filter(Boolean).join(', ');
    if (locationStr) {
      doc.text(locationStr, pageWidth - margin, yPos - 5, { align: 'right' });
    }
    
    yPos += 15;
    
    // Divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Ticket Information
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.text('Ticket Information', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date(booking.booking_dates?.date || procurement.created_at).toLocaleDateString();
    doc.text(`Token Number: ${booking.token}`, margin, yPos);
    doc.text(`Date: ${dateStr}`, pageWidth / 2, yPos);
    yPos += 8;
    doc.text(`Farmer Name: ${farmer.name}`, margin, yPos);
    doc.text(`Mobile: ${farmer.mobile_number}`, pageWidth / 2, yPos);
    yPos += 15;

    // Divider
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Procurement Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Procurement Details', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Product: ${booking.product_name}`, margin, yPos);
    yPos += 8;
    
    doc.text(`Quantity Brought: ${procurement.quantity_brought} kg`, margin, yPos);
    yPos += 8;
    doc.text(`Quantity Accepted: ${procurement.quantity_accepted} kg`, margin, yPos);
    yPos += 8;
    doc.text(`Quantity Rejected: ${procurement.quantity_rejected} kg`, margin, yPos);
    yPos += 15;

    // Divider
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Financials
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rate per kg: Rs. ${procurement.rate_per_kg}`, margin, yPos);
    yPos += 8;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: Rs. ${procurement.total_amount?.toLocaleString('en-IN')}`, margin, yPos);
    
    // Status badge text
    doc.setFontSize(11);
    const pStatus = (payment?.status || 'pending').toUpperCase();
    doc.setTextColor(payment?.status === 'credited' ? 5 : (payment?.status === 'initiated' ? 200 : 100), 
                     payment?.status === 'credited' ? 150 : 100, 
                     payment?.status === 'credited' ? 105 : 20);
    doc.text(`Payment Status: ${pStatus}`, pageWidth / 2, yPos);
    
    doc.setTextColor(15, 23, 42); // reset to slate-900
    yPos += 15;

    // Notes
    if (procurement.note) {
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Staff Note', margin, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const splitNote = doc.splitTextToSize(procurement.note, pageWidth - (margin * 2));
      doc.text(splitNote, margin, yPos);
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('This is a system generated receipt. For any discrepancies, please contact your procurement centre.', margin, doc.internal.pageSize.height - 20);

    // Save PDF
    doc.save(`Receipt_${booking.token}_${dateStr.replace(/\//g, '-')}.pdf`);
    
    return true;
  } catch (err) {
    console.error('Error generating PDF receipt:', err);
    throw err;
  }
};
