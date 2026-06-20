export interface InvoiceEmail {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
  preview: string;
  amount: string;
  filename: string;
  mimeType: string;
}

export const invoiceEmails: InvoiceEmail[] = [
  {
    id: '06',
    from: 'Brightpath Consulting',
    fromEmail: 'billing@brightpath-consulting.com',
    subject: 'Invoice #BPC-2026-0441 – Professional Services',
    date: 'Today, 09:14',
    preview: 'Please find attached our invoice for consulting services rendered in May 2026.',
    amount: '€26,153.18',
    filename: '06_brightpath_consulting_en.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: '04',
    from: 'Amazon Web Services',
    fromEmail: 'aws-invoices@amazon.com',
    subject: 'AWS Invoice – May 2026 – Globus Group',
    date: 'Today, 07:02',
    preview: 'Your AWS invoice for the billing period 01 May – 31 May 2026 is now available.',
    amount: '$7,216.15',
    filename: '04_aws_cloud_en.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: '10',
    from: 'Dell GmbH',
    fromEmail: 'invoicing@dell.com',
    subject: 'Dell Invoice INV-DE-20260617 – Hardware Purchase',
    date: 'Yesterday, 16:45',
    preview: 'Attached is your invoice for the hardware order placed on 10.06.2026.',
    amount: '€17,814.30',
    filename: '10_dell_hardware_en.png',
    mimeType: 'image/png',
  },
  {
    id: '02',
    from: 'Microsoft Ireland',
    fromEmail: 'invoicing@microsoft.com',
    subject: 'Microsoft Invoice – Software Licenses – June 2026',
    date: 'Yesterday, 11:30',
    preview: 'Your invoice for Microsoft 365 and Azure Active Directory licenses is attached.',
    amount: '€2,407.43',
    filename: '02_microsoft_licenses_en.pdf',
    mimeType: 'application/pdf',
  },
  {
    id: '07',
    from: 'Hotel Adlon Kempinski',
    fromEmail: 'konferenz@hotel-adlon.de',
    subject: 'Rechnung Nr. 2026-3847 – Konferenzaufenthalt',
    date: 'Jun 18, 14:00',
    preview: 'Anbei erhalten Sie die Rechnung für den Konferenzaufenthalt vom 14.–16. Juni 2026.',
    amount: '€1,625.65',
    filename: '07_hotel_adlon_de.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: '05',
    from: 'Bürobedarf Schmidt',
    fromEmail: 'bestellung@buerobedarf-schmidt.de',
    subject: 'Ihre Rechnung 2026-08812 – Büromaterial',
    date: 'Jun 17, 10:22',
    preview: 'Vielen Dank für Ihre Bestellung. Im Anhang finden Sie Ihre Rechnung.',
    amount: '€841.88',
    filename: '05_buerobedarf_de.png',
    mimeType: 'image/png',
  },
  {
    id: '08',
    from: 'Adobe Ireland',
    fromEmail: 'billing@adobe.com',
    subject: 'Adobe Creative Cloud – Invoice June 2026',
    date: 'Jun 16, 09:55',
    preview: 'Your Creative Cloud subscription invoice for June 2026 is attached.',
    amount: '€496.10',
    filename: '08_adobe_creativecloud_en.png',
    mimeType: 'image/png',
  },
  {
    id: '01',
    from: 'Stadtwerke München',
    fromEmail: 'rechnungen@stadtwerke-muenchen.de',
    subject: 'Ihre Gasrechnung – Abrechnungszeitraum Mai 2026',
    date: 'Jun 15, 08:10',
    preview: 'Ihre monatliche Gasabrechnung für den Zeitraum 01.05.–31.05.2026 liegt bei.',
    amount: '€258.44',
    filename: '01_stadtwerke_gas_de.pdf',
    mimeType: 'application/pdf',
  },
  {
    id: '03',
    from: 'E.ON Energie',
    fromEmail: 'rechnung@eon-energie.de',
    subject: 'Stromrechnung Mai 2026 – Kundennummer 4471289',
    date: 'Jun 15, 07:45',
    preview: 'Anbei erhalten Sie Ihre Stromrechnung für den Abrechnungsmonat Mai 2026.',
    amount: '€163.09',
    filename: '03_eon_strom_de.png',
    mimeType: 'image/png',
  },
  {
    id: '09',
    from: 'Deutsche Telekom',
    fromEmail: 'rechnungen@telekom.de',
    subject: 'Ihre Telekom Rechnung – Juni 2026',
    date: 'Jun 14, 12:30',
    preview: 'Ihre monatliche Rechnung für Internet- und Telefonleistungen ist verfügbar.',
    amount: '€86.73',
    filename: '09_telekom_internet_de.pdf',
    mimeType: 'application/pdf',
  },
];
