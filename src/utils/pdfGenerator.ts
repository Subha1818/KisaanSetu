import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabaseClient';
import QRCode from 'qrcode';

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

export const generateTokenPDF = async (bookingId: string) => {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
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
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new Error(error?.message || 'Failed to fetch booking details');
    }

    const centre = booking.procurement_centres as any;
    const farmer = booking.users as any;
    const geo = centre.geo_blocks || {};

    const doc = new jsPDF();
    const margin = 20;
    let yPos = margin;
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('AgriProcure', margin, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Procurement Token & Gate Pass', margin, yPos);
    
    // Right side Header (Centre Info)
    doc.setFontSize(10);
    doc.text(centre.name || 'Procurement Centre', pageWidth - margin, yPos - 10, { align: 'right' });
    const locationStr = [geo.block_name, geo.district_name].filter(Boolean).join(', ');
    if (locationStr) {
      doc.text(locationStr, pageWidth - margin, yPos - 5, { align: 'right' });
    }
    
    yPos += 15;
    
    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Token Information
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Token Details', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date(booking.booking_dates?.date).toLocaleDateString();
    
    doc.text(`Token Number: ${booking.token}`, margin, yPos);
    doc.text(`Scheduled Date: ${dateStr}`, pageWidth / 2, yPos);
    yPos += 8;
    doc.text(`Farmer Name: ${farmer.name}`, margin, yPos);
    doc.text(`Mobile: ${farmer.mobile_number}`, pageWidth / 2, yPos);
    yPos += 8;
    doc.text(`Product: ${booking.product_name}`, margin, yPos);
    doc.text(`Estimated Quantity: ${booking.quantity} kg`, pageWidth / 2, yPos);
    
    yPos += 20;

    // Generate and add QR Code
    try {
      const qrDataUrl = await QRCode.toDataURL(booking.id, {
        width: 100,
        margin: 1,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff'
        }
      });
      // Add QR image to PDF
      doc.addImage(qrDataUrl, 'PNG', margin, yPos, 40, 40);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan for official verification at the gate', margin + 45, yPos + 20);
      yPos += 50;
    } catch (qrError) {
      console.error('Failed to generate QR code for PDF:', qrError);
      yPos += 10;
    }

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Instructions
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Gate Pass Instructions', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    
    const instructions = [
      '1. Present this token (digital or printed) along with your physical ID card at the centre gate.',
      '2. Ensure your crop meets quality standards before joining the queue.',
      '3. Your payment will be initiated directly to your registered bank account upon successful procurement.',
      '4. Please arrive on your scheduled date. Late arrivals may not be accommodated.'
    ];

    instructions.forEach(instruction => {
      const splitLines = doc.splitTextToSize(instruction, pageWidth - (margin * 2));
      doc.text(splitLines, margin, yPos);
      yPos += splitLines.length * 6;
    });

    // Save PDF
    doc.save(`Token_${booking.token}_${dateStr.replace(/\//g, '-')}.pdf`);
    
    return true;
  } catch (err) {
    console.error('Error generating PDF token:', err);
    throw err;
  }
};
