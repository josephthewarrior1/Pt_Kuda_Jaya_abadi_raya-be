import sys
path = r"d:\thesis\pt kuda jaya dashboard\pt kuda jaya dashboard\src\pages\Kwitansi\KwitansiCreate.jsx"
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Make the changes!
# 1. Imports
code = code.replace(
    'import CustomerDAO from "../../daos/CustomerDao";\nimport CompanyDAO from "../../daos/CompanyDao";',
    'import CustomerDAO from "../../daos/CustomerDao";\nimport CompanyDAO from "../../daos/CompanyDao";\nimport PaymentDAO from "../../daos/PaymentDao";\nimport KwitansiDAO from "../../daos/KwitansiDao";'
)

# 2. State
code = code.replace(
    '  // Customer\n  const [customers, setCustomers] = useState([]);\n  const [selectedCustomer, setSelectedCustomer] = useState(null);\n  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);\n  const [customerSearch, setCustomerSearch] = useState("");',
    '  // Payments\n  const [payments, setPayments] = useState([]);\n  const [customers, setCustomers] = useState([]);\n  const [selectedPayment, setSelectedPayment] = useState(null);\n  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);\n  const [paymentSearch, setPaymentSearch] = useState("");'
)

# 3. useEffect
code = code.replace(
    'useEffect(() => { fetchCompanyProfile(); fetchCustomers(); }, []);',
    'useEffect(() => { fetchCompanyProfile(); fetchPaymentsAndCustomers(); }, []);'
)
code = code.replace(
    'useEffect(() => { if (selectedCustomer) generatePaymentDescription(); }, [selectedCustomer]);',
    'useEffect(() => { \n    if (selectedPayment) {\n        generatePaymentDescription();\n        setFormData(prev => ({ ...prev, jumlah: String(selectedPayment.amount), terbilang: numberToWords(selectedPayment.amount) }));\n    }\n  }, [selectedPayment]);'
)

# 4. generatePaymentDescription
code = code.replace(
    '  const generatePaymentDescription = () => {\n    if (selectedCustomer?.carData) {\n      const desc = `Premi ${selectedCustomer.carData?.carBrand || ""} ${selectedCustomer.carData?.carModel || ""} No. Polisi: ${selectedCustomer.carData?.plateNumber || "TBA"}`.trim();\n      setFormData((prev) => ({ ...prev, pembayaran: desc }));\n    }\n  };',
    '  const generatePaymentDescription = () => {\n    const cd = selectedPayment?.customerData?.carData;\n    \n    let desc = `Pembayaran Invoice ${selectedPayment?.invoiceNumber || ""}`.trim();\n    if (selectedPayment?.notes) {\n      desc += ` - ${selectedPayment.notes}`;\n    }\n    \n    setFormData((prev) => ({ ...prev, pembayaran: desc }));\n  };'
)

# 5. fetchPaymentsAndCustomers
code = code.replace(
    '  const fetchCustomers = async () => {\n    try {\n      loading.start();\n      const r = await CustomerDAO.getAllCustomers();\n      if (r.success) setCustomers(r.customers || []);\n      else message("Failed to load customers", "error");\n    } catch (e) { console.error(e); message("Failed to load customers", "error"); }\n    finally { loading.stop(); }\n  };',
    '''  const fetchPaymentsAndCustomers = async () => {
    try {
      loading.start();
      const [payRes, custRes] = await Promise.allSettled([
        PaymentDAO.getAllPayments(),
        CustomerDAO.getAllCustomers()
      ]);
      const pays = (payRes.status === 'fulfilled' && (payRes.value?.payments || payRes.value?.data || payRes.value)) || [];
      const custs = (custRes.status === 'fulfilled' && custRes.value?.customers) || [];
      setCustomers(custs);

      const paysArr = Array.isArray(pays) ? pays : [];
      const paidPays = paysArr.filter(p => p.status === 'Paid');
      const enriched = paidPays.map(p => {
         const c = custs.find(cu => cu.id === p.customerId);
         return { ...p, customerData: c || {} };
      });
      setPayments(enriched);
    } catch (e) { console.error(e); message("Failed to load data", "error"); }
    finally { loading.stop(); }
  };'''
)

# 6. Validations
code = code.replace('!selectedCustomer', '!selectedPayment')
code = code.replace('setSelectedCustomer(null);', 'setSelectedPayment(null);')

# 7. downloadPDF
code = code.replace(
'''  const downloadPDF = async () => {
    try {
      loading.start();
      const element = receiptRef.current;
      if (!element) throw new Error("Receipt element not found");

      await new Promise((r) => setTimeout(r, 250));''',
'''  const downloadPDF = async () => {
    try {
      loading.start();
      
      const res = await KwitansiDAO.generateKwitansi(selectedPayment.id);
      if (!res.success && !res.id) throw new Error(res.error || "Gagal mencatat kwitansi di server");
      const kwRecord = res.kwitansi || res;
      if (kwRecord && kwRecord.kwitansiNumber) setFormData(prev => ({ ...prev, nomor: kwRecord.kwitansiNumber }));
      
      await new Promise((r) => setTimeout(r, 600));

      const element = receiptRef.current;
      if (!element) throw new Error("Receipt element not found");'''
)

# 8. ReceiptContent
code = code.replace(
'{ id: "terima", label: "Terima dari", en: "Received From", value: selectedCustomer ? selectedCustomer.name : "____________________" },\n          { id: "alamat", label: "Alamat", en: "Address", value: selectedCustomer ? selectedCustomer.address : "____________________" },',
'{ id: "terima", label: "Terima dari", en: "Received From", value: selectedPayment?.customerData?.name || "____________________" },\n          { id: "alamat", label: "Alamat", en: "Address", value: selectedPayment?.customerData?.address || "____________________" },'
)

# 9. Filters
code = code.replace(
'''  const filteredCustomers = customers.filter((c) => {
    const s = customerSearch.toLowerCase();
    return c.name?.toLowerCase().includes(s) || c.phone?.toLowerCase().includes(s) || c.carData?.carBrand?.toLowerCase().includes(s) || c.carData?.plateNumber?.toLowerCase().includes(s);
  });''',
'''  const filteredPayments = payments.filter((p) => {
    const s = paymentSearch.toLowerCase();
    const c = p.customerData;
    return p.invoiceNumber?.toLowerCase().includes(s) || 
           c?.name?.toLowerCase().includes(s) || 
           c?.carData?.plateNumber?.toLowerCase().includes(s);
  });'''
)

# JSX replacements
code = code.replace('Section title="Customer"', 'Section title="Payment Source"')
code = code.replace('Field label="Select Customer"', 'Field label="Select Paid Payment"')

code = code.replace(
'''                        <Typography fontSize={14} sx={{ color: selectedCustomer ? C.text : C.textMuted }}>
                          {selectedCustomer
                            ? `${selectedCustomer.name} — ${selectedCustomer.carData?.plateNumber || "No Plate"}`
                            : "Search and select customer..."}
                        </Typography>''',
'''                        <Typography fontSize={14} sx={{ color: selectedPayment ? C.text : C.textMuted }}>
                          {selectedPayment
                            ? `${selectedPayment.invoiceNumber} — ${selectedPayment.customerData?.name || ""}`
                            : "Search and select a paid payment..."}
                        </Typography>'''
)

code = code.replace(
'''                  {selectedCustomer && (
                    <Box sx={{ mt: -1.5, mb: 0.5, p: 2, borderRadius: "8px", bgcolor: "#F8F9FA", border: `1px solid ${C.border}` }}>
                      <Grid container spacing={1.5}>
                        {[
                          { label: "Phone", value: selectedCustomer.phone },
                          { label: "Vehicle", value: `${selectedCustomer.carData?.carBrand || ""} ${selectedCustomer.carData?.carModel || ""}`.trim() },
                          { label: "Plate", value: selectedCustomer.carData?.plateNumber },
                          { label: "Address", value: selectedCustomer.address },
                        ].map(({ label, value }) => (
                          <Grid item xs={6} key={label}>
                            <Typography fontSize={11} sx={{ color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.2 }}>{label}</Typography>
                            <Typography fontSize={13} fontWeight={500} sx={{ color: C.text }}>{value || "—"}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}''',
'''                  {selectedPayment && (
                    <Box sx={{ mt: -1.5, mb: 0.5, p: 2, borderRadius: "8px", bgcolor: "#F8F9FA", border: `1px solid ${C.border}` }}>
                      <Grid container spacing={1.5}>
                        {[
                          { label: "Customer", value: selectedPayment.customerData?.name },
                          { label: "Amount", value: formatCurrency(selectedPayment.amount) },
                          { label: "Paid At", value: selectedPayment.paidDate ? new Date(selectedPayment.paidDate).toLocaleDateString("id-ID") : '-' },
                          { label: "Notes", value: selectedPayment.notes || "—" },
                        ].map(({ label, value }) => (
                          <Grid item xs={6} key={label}>
                            <Typography fontSize={11} sx={{ color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.2 }}>{label}</Typography>
                            <Typography fontSize={13} fontWeight={500} sx={{ color: C.text }}>{value || "—"}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}'''
)

code = code.replace(
'''                    {[
                      { label: "Name", value: selectedCustomer?.name },
                      { label: "Phone", value: selectedCustomer?.phone },
                      { label: "Address", value: selectedCustomer?.address },
                      { label: "Vehicle", value: `${selectedCustomer?.carData?.carBrand || ""} ${selectedCustomer?.carData?.carModel || ""}`.trim() },
                      { label: "Plate", value: selectedCustomer?.carData?.plateNumber },
                    ].map(({ label, value }) => (''',
'''                    {[
                      { label: "Name", value: selectedPayment?.customerData?.name },
                      { label: "Phone", value: selectedPayment?.customerData?.phone },
                      { label: "Address", value: selectedPayment?.customerData?.address },
                      { label: "Invoice", value: selectedPayment?.invoiceNumber },
                      { label: "Plate", value: selectedPayment?.customerData?.carData?.plateNumber },
                    ].map(({ label, value }) => ('''
)

code = code.replace(
'''      {/* ── Customer Dialog ── */}
      <Dialog open={openCustomerDialog} onClose={() => { setOpenCustomerDialog(false); setCustomerSearch(""); }}
        maxWidth="xs" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : "12px", m: 2 } }}>
        <Box sx={{ p: 2.5 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <IconButton size="small" onClick={() => { setOpenCustomerDialog(false); setCustomerSearch(""); }} sx={{ mr: 1 }}>
              <Icon icon="mdi:arrow-left" width={20} color={C.textSub} />
            </IconButton>
            <Typography fontSize={16} fontWeight={700} sx={{ color: C.text }}>Select Customer</Typography>
          </Box>
          <TextField fullWidth autoFocus size="small"
            placeholder="Search by name, phone, or plate..."
            value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Icon icon="mdi:magnify" width={18} color={C.textMuted} /></InputAdornment> }}
            sx={{ mb: 2, ...inputStyle }} />
          <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
            {filteredCustomers.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Icon icon="mdi:account-search" width={44} color="#C8CDD4" />
                <Typography fontSize={14} sx={{ color: C.textSub, mt: 1.5 }}>No customers found</Typography>
                {customerSearch && <Button onClick={() => setCustomerSearch("")} sx={{ mt: 1, textTransform: "none", fontSize: 12, color: C.primary }}>Clear search</Button>}
              </Box>
            ) : (
              <Stack spacing={1}>
                {filteredCustomers.map((customer) => {
                  const sel = selectedCustomer?.id === customer.id;
                  return (
                    <Box key={customer.id}
                      onClick={() => { setSelectedCustomer(customer); setOpenCustomerDialog(false); setCustomerSearch(""); }}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "8px", cursor: "pointer",
                        border: `1px solid ${sel ? C.primary : C.border}`,
                        bgcolor: sel ? C.primaryLight : C.white, transition: "all 0.15s",
                        "&:hover": { borderColor: C.primary, bgcolor: sel ? C.primaryLight : "#FAFBFC" },
                      }}>
                      <Avatar sx={{ width: 38, height: 38, bgcolor: C.primary, fontSize: 15, fontWeight: 700 }}>
                        {customer.name?.charAt(0)?.toUpperCase() || "C"}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography fontSize={13.5} fontWeight={600} sx={{ color: C.text }}>{customer.name}</Typography>
                        <Typography fontSize={12} sx={{ color: C.textSub }}>{customer.phone || "—"}</Typography>
                        <Typography fontSize={12} sx={{ color: C.textMuted }}>{customer.carData?.carBrand || "No car"} · {customer.carData?.plateNumber || "No plate"}</Typography>
                      </Box>
                      {sel && <Icon icon="mdi:check-circle" width={18} color={C.primary} />}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      </Dialog>''',
'''      {/* ── Payment Dialog ── */}
      <Dialog open={openPaymentDialog} onClose={() => { setOpenPaymentDialog(false); setPaymentSearch(""); }}
        maxWidth="xs" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : "12px", m: 2 } }}>
        <Box sx={{ p: 2.5 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <IconButton size="small" onClick={() => { setOpenPaymentDialog(false); setPaymentSearch(""); }} sx={{ mr: 1 }}>
              <Icon icon="mdi:arrow-left" width={20} color={C.textSub} />
            </IconButton>
            <Typography fontSize={16} fontWeight={700} sx={{ color: C.text }}>Select Paid Payment</Typography>
          </Box>
          <TextField fullWidth autoFocus size="small"
            placeholder="Search by invoice, name, or plate..."
            value={paymentSearch} onChange={(e) => setPaymentSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Icon icon="mdi:magnify" width={18} color={C.textMuted} /></InputAdornment> }}
            sx={{ mb: 2, ...inputStyle }} />
          <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
            {filteredPayments.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Icon icon="mdi:receipt-text" width={44} color="#C8CDD4" />
                <Typography fontSize={14} sx={{ color: C.textSub, mt: 1.5 }}>No paid payments found</Typography>
                {paymentSearch && <Button onClick={() => setPaymentSearch("")} sx={{ mt: 1, textTransform: "none", fontSize: 12, color: C.primary }}>Clear search</Button>}
              </Box>
            ) : (
              <Stack spacing={1}>
                {filteredPayments.map((payment) => {
                  const sel = selectedPayment?.id === payment.id;
                  const c = payment.customerData;
                  return (
                    <Box key={payment.id}
                      onClick={() => { setSelectedPayment(payment); setOpenPaymentDialog(false); setPaymentSearch(""); }}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "8px", cursor: "pointer",
                        border: `1px solid ${sel ? C.primary : C.border}`,
                        bgcolor: sel ? C.primaryLight : C.white, transition: "all 0.15s",
                        "&:hover": { borderColor: C.primary, bgcolor: sel ? C.primaryLight : "#FAFBFC" },
                      }}>
                      <Avatar sx={{ width: 38, height: 38, bgcolor: C.primary, fontSize: 13, fontWeight: 700 }}>
                        <Icon icon="mdi:receipt-text" width={18} />
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography fontSize={13.5} fontWeight={600} sx={{ color: C.text }}>{payment.invoiceNumber || "No Invoice"}</Typography>
                        <Typography fontSize={12} sx={{ color: C.textSub }}>{c?.name || "—"} ({formatCurrency(payment.amount)})</Typography>
                        <Typography fontSize={12} sx={{ color: C.textMuted }}>{c?.carData?.carBrand || "No car"} · {c?.carData?.plateNumber || "No plate"}</Typography>
                      </Box>
                      {sel && <Icon icon="mdi:check-circle" width={18} color={C.primary} />}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      </Dialog>'''
)

code = code.replace('setOpenCustomerDialog(true)', 'setOpenPaymentDialog(true)')
code = code.replace('selectedCustomer', 'selectedPayment')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("success!")
