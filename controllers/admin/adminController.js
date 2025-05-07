const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const Order = require("../../models/orderSchema")
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const pageError = async(req,res)=>{
    res.render("admin-error")
}

const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:null })
}
const login = async (req,res) =>{
    try {
        
        const {email,password}=req.body
       
        const admin = await User.findOne({isAdmin:true,email})

        if(!admin){
            return res.redirect("/admin/login")
        }
        console.log(password);
        
        const passwordMatch = await bcrypt.compare(password,admin.password)
        if(!passwordMatch){
            
            return res.redirect("/admin/login")
             
        }
        req.session.admin = true 
        if(req.session.admin){
            res.redirect("/admin")
        }else{
            res.redirect("/admin/login")
        }

    }catch(error) {
        console.error('Admin login error',error)
        return res.redirect("/pageError")
    }
}


const logout = async(req,res)=>{
    try {
        req.session.destroy(err =>{
            if(err){
                console.log("Erro destroying session",err);
                return res.redirect("/pageError")
            }else{
                return res.redirect("/admin/login")
            }
           
        })
    } catch (error) {
        console.log("unexpected error during logout",error);
        res.redirect("/pageError")
        
        
    }
    
}




const salesReport = async (req, res) => {
    try {
        const { dateRange, startDate, endDate, page = 1, sort = 'desc' } = req.query;
        const perPage = 10;
        const skip = (page - 1) * perPage;

        // Calculate date range
        let dateFilter = {};
        if (dateRange) {
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(now.setHours(0, 0, 0, 0)),
                            $lte: new Date(now.setHours(23, 59, 59, 999))
                        }
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                            $lte: new Date(yesterday.setHours(23, 59, 59, 999))
                        }
                    };
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - 7);
                    dateFilter = {
                        createdOn: {
                            $gte: weekStart,
                            $lte: now
                        }
                    };
                    break;
                case 'month':
                    const monthStart = new Date(now);
                    monthStart.setMonth(monthStart.getMonth() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: monthStart,
                            $lte: now
                        }
                    };
                    break;
                case 'year':
                    const yearStart = new Date(now);
                    yearStart.setFullYear(yearStart.getFullYear() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: yearStart,
                            $lte: now
                        }
                    };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        dateFilter = {
                            createdOn: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
                        };
                    }
                    break;
            }
        }

        // Sort orders
        const sortOrder = sort === 'asc' ? 1 : -1;

        // Fetch orders with date filter and sorting
        const orders = await Order.find(dateFilter)
            .sort({ createdOn: sortOrder })
            .skip(skip)
            .limit(perPage)
            .populate('userId', 'name email') // Optional: populate user info
            .lean();

        // Calculate total orders count for pagination
        const totalOrders = await Order.countDocuments(dateFilter);
        const totalPages = Math.ceil(totalOrders / perPage);

        // Calculate sales summary
        const allOrders = await Order.find(dateFilter).lean();
        
        const summary = {
            grossSales: 0,
            cancelledOrReturned: 0,
            couponsRedeemed: 0,
            discounts: 0,
            netSales: 0,
            totalOrders: allOrders.length,
            orderTypes: {
                razorPay: 0,
                cod: 0,
                wallet: 0
            }
        };

        allOrders.forEach(order => {
            // Gross Sales
            summary.grossSales += order.totalPrice || 0;

            // Cancelled or Returned
            if (order.status === 'Cancelled' || order.status === 'Returned') {
                summary.cancelledOrReturned += order.finalAmount || 0;
            }

            // Coupons and Discounts
            summary.couponsRedeemed += order.couponDiscount || 0;
            summary.discounts += order.offerDiscount || 0;

            // Order Types count
            if (order.orderType) {
                summary.orderTypes[order.orderType] = (summary.orderTypes[order.orderType] || 0) + 1;
            }
        });

        // Calculate Net Sales
        summary.netSales = summary.grossSales - 
                          summary.cancelledOrReturned - 
                          summary.couponsRedeemed - 
                          summary.discounts;

        return res.render("saleReport", {
            orders,
            summary,
            currentPage: parseInt(page),
            totalPages,
            dateRange,
            startDate,
            endDate,
            sort
        });
    } catch (error) {
        console.error('Sales Report Error:', error);
        return res.status(500).render('error', { 
            message: 'Error generating sales report',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
// PDF Export
const exportToPDF = async (req, res) => {
    try {
        const { dateRange, startDate, endDate } = req.query;
        let dateFilter = {};

        // Apply the same date filtering logic as in salesReport
        if (dateRange) {
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(now.setHours(0, 0, 0, 0)),
                            $lte: new Date(now.setHours(23, 59, 59, 999))
                        }
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                            $lte: new Date(yesterday.setHours(23, 59, 59, 999))
                        }
                    };
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - 7);
                    dateFilter = {
                        createdOn: {
                            $gte: weekStart,
                            $lte: now
                        }
                    };
                    break;
                case 'month':
                    const monthStart = new Date(now);
                    monthStart.setMonth(monthStart.getMonth() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: monthStart,
                            $lte: now
                        }
                    };
                    break;
                case 'year':
                    const yearStart = new Date(now);
                    yearStart.setFullYear(yearStart.getFullYear() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: yearStart,
                            $lte: now
                        }
                    };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        dateFilter = {
                            createdOn: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
                        };
                    }
                    break;
            }
        }

        const orders = await Order.find(dateFilter).sort({ createdOn: -1 }).lean();
        
        // Generate PDF using pdfmake
        const pdfmake = require('pdfmake');
        const fonts = {
            Roboto: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };

        const printer = new pdfmake(fonts);

        // Calculate order type counts
        const orderTypeCounts = orders.reduce((acc, order) => {
            acc[order.orderType] = (acc[order.orderType] || 0) + 1;
            return acc;
        }, { razorPay: 0, cod: 0, wallet: 0 });

        // Prepare document content
        const docDefinition = {
            content: [
                { text: 'Sales Report', style: 'header' },
                { text: '\n' },
                {
                    text: `Date Range: ${dateRange}${dateRange === 'custom' && startDate && endDate ? 
                        ` (${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')})` : ''}`,
                    style: 'subheader'
                },
                { text: '\n' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'Order ID', style: 'tableHeader' },
                                { text: 'Amount', style: 'tableHeader' },
                                { text: 'Discount', style: 'tableHeader' },
                                { text: 'Coupon', style: 'tableHeader' },
                                { text: 'Final Amount', style: 'tableHeader' },
                                { text: 'Status', style: 'tableHeader' },
                                { text: 'Order Type', style: 'tableHeader' },
                                { text: 'Date', style: 'tableHeader' }
                            ],
                            ...orders.map(order => [
                                order.orderId,
                                `₹${(order.totalPrice || 0).toLocaleString('en-IN')}`,
                                `₹${(order.offerDiscount || 0).toLocaleString('en-IN')}`,
                                `₹${(order.couponDiscount || 0).toLocaleString('en-IN')}`,
                                `₹${(order.finalAmount || 0).toLocaleString('en-IN')}`,
                                order.status,
                                order.orderType,
                                new Date(order.createdOn).toLocaleDateString('en-IN')
                            ])
                        ]
                    }
                },
                { text: '\n' },
                { text: 'Summary', style: 'header' },
                { text: '\n' },
                {
                    table: {
                        widths: ['*', '*'],
                        body: [
                            [
                                { text: 'Total Orders', style: 'summaryLabel' },
                                { text: orders.length.toString(), style: 'summaryValue' }
                            ],
                            [
                                { text: 'Total Amount', style: 'summaryLabel' },
                                { text: `₹${orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toLocaleString('en-IN')}`, style: 'summaryValue' }
                            ],
                            [
                                { text: 'Total Discount', style: 'summaryLabel' },
                                { text: `₹${orders.reduce((sum, order) => sum + (order.offerDiscount || 0), 0).toLocaleString('en-IN')}`, style: 'summaryValue' }
                            ],
                            [
                                { text: 'Total Coupon Discount', style: 'summaryLabel' },
                                { text: `₹${orders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0).toLocaleString('en-IN')}`, style: 'summaryValue' }
                            ],
                            [
                                { text: 'Net Amount', style: 'summaryLabel' },
                                { text: `₹${orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0).toLocaleString('en-IN')}`, style: 'summaryValue' }
                            ],
                            [
                                { text: 'RazorPay Orders', style: 'summaryLabel' },
                                { text: orderTypeCounts.razorPay.toString(), style: 'summaryValue' }
                            ],
                            [
                                { text: 'COD Orders', style: 'summaryLabel' },
                                { text: orderTypeCounts.cod.toString(), style: 'summaryValue' }
                            ],
                            [
                                { text: 'Wallet Orders', style: 'summaryLabel' },
                                { text: orderTypeCounts.wallet.toString(), style: 'summaryValue' }
                            ]
                        ]
                    }
                }
            ],
            styles: {
                header: {
                    fontSize: 22,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                },
                subheader: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 10, 0, 10]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 12,
                    color: 'black',
                    fillColor: '#f0f0f0'
                },
                summaryLabel: {
                    bold: true,
                    fontSize: 12
                },
                summaryValue: {
                    fontSize: 12,
                    alignment: 'right'
                }
            },
            defaultStyle: {
                fontSize: 10
            }
        };

        // Generate PDF
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString()}.pdf`);
        
        // Pipe the PDF to the response
        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF report: ' + error.message);
    }
};

// Excel Export
const exportToExcel = async (req, res) => {
    try {
        const { dateRange, startDate, endDate } = req.query;
        let dateFilter = {};

        // Apply the same date filtering logic
        if (dateRange) {
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(now.setHours(0, 0, 0, 0)),
                            $lte: new Date(now.setHours(23, 59, 59, 999))
                        }
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                            $lte: new Date(yesterday.setHours(23, 59, 59, 999))
                        }
                    };
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - 7);
                    dateFilter = {
                        createdOn: {
                            $gte: weekStart,
                            $lte: now
                        }
                    };
                    break;
                case 'month':
                    const monthStart = new Date(now);
                    monthStart.setMonth(monthStart.getMonth() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: monthStart,
                            $lte: now
                        }
                    };
                    break;
                case 'year':
                    const yearStart = new Date(now);
                    yearStart.setFullYear(yearStart.getFullYear() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: yearStart,
                            $lte: now
                        }
                    };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        dateFilter = {
                            createdOn: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
                        };
                    }
                    break;
            }
        }

        const orders = await Order.find(dateFilter).sort({ createdOn: -1 }).lean();
        
        // Generate Excel using exceljs
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Noor Fragrance';
        workbook.lastModifiedBy = 'Noor Fragrance';
        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet = workbook.addWorksheet('Sales Report', {
            properties: {
                tabColor: { argb: 'FF0000FF' }
            },
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            }
        });

        // Set column widths and styles
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 15, style: { font: { bold: true } } },
            { header: 'Amount', key: 'amount', width: 15, style: { numFmt: '₹#,##0.00' } },
            { header: 'Discount', key: 'discount', width: 15, style: { numFmt: '₹#,##0.00' } },
            { header: 'Coupon', key: 'coupon', width: 15, style: { numFmt: '₹#,##0.00' } },
            { header: 'Final Amount', key: 'finalAmount', width: 15, style: { numFmt: '₹#,##0.00' } },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Order Type', key: 'orderType', width: 15 },
            { header: 'Date', key: 'date', width: 20, style: { numFmt: 'dd/mm/yyyy' } }
        ];

        // Add title and date range
        worksheet.mergeCells('A1:H1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'Sales Report';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        if (dateRange) {
            worksheet.mergeCells('A2:H2');
            const dateRangeCell = worksheet.getCell('A2');
            dateRangeCell.value = `Date Range: ${dateRange}${dateRange === 'custom' && startDate && endDate ? 
                ` (${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')})` : ''}`;
            dateRangeCell.font = { bold: true, color: { argb: 'FF000000' } };
            dateRangeCell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Style the header row
        const headerRow = worksheet.getRow(4);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF000000' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 20;

        // Add data rows
        orders.forEach(order => {
            const row = worksheet.addRow({
                orderId: order.orderId,
                amount: order.totalPrice || 0,
                discount: order.offerDiscount || 0,
                coupon: order.couponDiscount || 0,
                finalAmount: order.finalAmount || 0,
                status: order.status,
                orderType: order.orderType,
                date: order.createdOn
            });
            
            // Style the row
            row.alignment = { vertical: 'middle' };
            row.height = 20;
            
            // Add borders to each cell in the row
            for (let i = 1; i <= 8; i++) {
                const cell = row.getCell(i);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        });

        // Calculate order type counts
        const orderTypeCounts = orders.reduce((acc, order) => {
            acc[order.orderType] = (acc[order.orderType] || 0) + 1;
            return acc;
        }, { razorPay: 0, cod: 0, wallet: 0 });

        // Add summary section
        const lastRow = worksheet.rowCount;
        worksheet.mergeCells(`A${lastRow + 2}:H${lastRow + 2}`);
        const summaryTitleCell = worksheet.getCell(`A${lastRow + 2}`);
        summaryTitleCell.value = 'Summary';
        summaryTitleCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
        summaryTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        summaryTitleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Add summary data
        const summaryData = [
            ['Total Orders', orders.length],
            ['Total Amount', orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0)],
            ['Total Discount', orders.reduce((sum, order) => sum + (order.offerDiscount || 0), 0)],
            ['Total Coupon Discount', orders.reduce((sum, order) => sum + (order.couponDiscount || 0), 0)],
            ['Net Amount', orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0)],
            ['RazorPay Orders', orderTypeCounts.razorPay],
            ['COD Orders', orderTypeCounts.cod],
            ['Wallet Orders', orderTypeCounts.wallet]
        ];

        summaryData.forEach(([label, value], index) => {
            const row = worksheet.addRow([label, value]);
            row.getCell(1).font = { bold: true };
            if (index < 5 && index > 0) {
                row.getCell(2).numFmt = '₹#,##0.00';
            }
            row.alignment = { vertical: 'middle' };
            row.height = 20;
            
            // Add borders to summary cells
            row.getCell(1).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            row.getCell(2).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Set response headers for Excel
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);
        
        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).send('Error generating Excel report: ' + error.message);
    }
};

const loadDashboard = async (req, res) => {
    try {
        // Get filter parameters from query
        const { timeFilter = 'all', startDate, endDate, orderStatus, sortBy = 'createdOn', sortOrder = 'desc' } = req.query;
        
        // Get counts for key metrics
        const totalUsers = await User.countDocuments({ isAdmin: false }) || 0;
        const totalProducts = await Product.countDocuments({ isDeleted: false }) || 0;
        const totalCategories = await Category.countDocuments({ isDeleted: false }) || 0;
        const totalOrders = await Order.countDocuments() || 0;

        // Build date filter based on time period
        let dateFilter = {};
        if (timeFilter !== 'all') {
            const now = new Date();
            
            switch (timeFilter) {
                case 'today':
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(now.setHours(0, 0, 0, 0)),
                            $lte: new Date(now.setHours(23, 59, 59, 999))
                        }
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                            $lte: new Date(yesterday.setHours(23, 59, 59, 999))
                        }
                    };
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - 7);
                    dateFilter = {
                        createdOn: {
                            $gte: weekStart,
                            $lte: now
                        }
                    };
                    break;
                case 'month':
                    const monthStart = new Date(now);
                    monthStart.setMonth(monthStart.getMonth() - 1);
                    dateFilter = {
                        createdOn: {
                            $gte: monthStart,
                            $lte: now
                        }
                    };
                    break;
                case 'year':
                    const yearStart = new Date(2025, 3, 1); // April 1, 2025
                    const yearEnd = new Date(2026, 3, 30, 23, 59, 59, 999); // April 30, 2026
                    dateFilter = {
                        createdOn: {
                            $gte: yearStart,
                            $lte: yearEnd
                        }
                    };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        const startDateTime = new Date(startDate);
                        const endDateTime = new Date(endDate);
                        endDateTime.setHours(23, 59, 59, 999);
                        
                        dateFilter = {
                            createdOn: {
                                $gte: startDateTime,
                                $lte: endDateTime
                            }
                        };
                    }
                    break;
            }
        }
        
        // Add order status filter if provided
        let orderFilter = {};
        if (orderStatus && orderStatus !== 'all') {
            orderFilter = { status: orderStatus };
        }
        
        // Combine filters
        const combinedFilter = { ...dateFilter, ...orderFilter };

        // Revenue metrics
        const allOrders = await Order.find(combinedFilter).catch(() => []);
        let totalRevenue = 0;
        let pendingRevenue = 0;
        let deliveredRevenue = 0;
        let cancelledRevenue = 0;
        
        allOrders.forEach(order => {
            if (order.status !== 'Cancelled' && order.status !== 'Returned' && order.status !== 'Payment failed') {
                totalRevenue += order.finalAmount || 0;
            }
            
            if (order.status === 'Pending' || order.status === 'Processing' || order.status === 'Shipped') {
                pendingRevenue += order.finalAmount || 0;
            } else if (order.status === 'Delivered') {
                deliveredRevenue += order.finalAmount || 0;
            } else if (order.status === 'Cancelled' || order.status === 'Returned') {
                cancelledRevenue += order.finalAmount || 0;
            }
        });

        // Dynamic time-based revenue and order data
        let labels = [];
        let monthlyRevenue = [];
        let monthlyOrders = [];
        
        const now = new Date();
        if (timeFilter === 'today') {
            // Hourly data for today (24 hours)
            for (let hour = 0; hour < 24; hour++) {
                const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
                const endOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 59, 59, 999);
                
                labels.push(`${hour}:00`);
                
                const ordersInHour = await Order.find({
                    createdOn: { $gte: startOfHour, $lte: endOfHour },
                    status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                }).catch(() => []);
                
                let revenueInHour = 0;
                ordersInHour.forEach(order => {
                    revenueInHour += order.finalAmount || 0;
                });
                
                monthlyRevenue.push(revenueInHour);
                monthlyOrders.push(ordersInHour.length);
            }
        } else if (timeFilter === 'yesterday') {
            // Hourly data for yesterday (24 hours)
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            for (let hour = 0; hour < 24; hour++) {
                const startOfHour = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hour, 0, 0);
                const endOfHour = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hour, 59, 59, 999);
                
                labels.push(`${hour}:00`);
                
                const ordersInHour = await Order.find({
                    createdOn: { $gte: startOfHour, $lte: endOfHour },
                    status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                }).catch(() => []);
                
                let revenueInHour = 0;
                ordersInHour.forEach(order => {
                    revenueInHour += order.finalAmount || 0;
                });
                
                monthlyRevenue.push(revenueInHour);
                monthlyOrders.push(ordersInHour.length);
            }
        } else if (timeFilter === 'week') {
            // Daily data for the last 7 days
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - 7);
            
            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                
                const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
                const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
                
                labels.push(date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' }));
                
                const ordersInDay = await Order.find({
                    createdOn: { $gte: startOfDay, $lte: endOfDay },
                    status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                }).catch(() => []);
                
                let revenueInDay = 0;
                ordersInDay.forEach(order => {
                    revenueInDay += order.finalAmount || 0;
                });
                
                monthlyRevenue.push(revenueInDay);
                monthlyOrders.push(ordersInDay.length);
            }
        } else if (timeFilter === 'month') {
            // Daily data for the last 30 days
            const monthStart = new Date(now);
            monthStart.setDate(monthStart.getDate() - 30);
            
            for (let i = 0; i < 30; i++) {
                const date = new Date(monthStart);
                date.setDate(monthStart.getDate() + i);
                
                const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
                const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
                
                labels.push(date.toLocaleDateString('default', { month: 'short', day: 'numeric' }));
                
                const ordersInDay = await Order.find({
                    createdOn: { $gte: startOfDay, $lte: endOfDay },
                    status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                }).catch(() => []);
                
                let revenueInDay = 0;
                ordersInDay.forEach(order => {
                    revenueInDay += order.finalAmount || 0;
                });
                
                monthlyRevenue.push(revenueInDay);
                monthlyOrders.push(ordersInDay.length);
            }
        } else if (timeFilter === 'year') {
            // Monthly data for April 2025 to April 2026
            const yearStart = new Date(2025, 3, 1); // April 2025
            for (let i = 0; i < 13; i++) { // 13 months to include April 2026
                const date = new Date(yearStart.getFullYear(), yearStart.getMonth() + i, 1);
                
                const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
                
                labels.push(date.toLocaleString('default', { month: 'short', year: 'numeric' }));
                
                const ordersInMonth = await Order.find({
                    createdOn: { $gte: startOfMonth, $lte: endOfMonth },
                    status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                }).catch(() => []);
                
                let revenueInMonth = 0;
                ordersInMonth.forEach(order => {
                    revenueInMonth += order.finalAmount || 0;
                });
                
                monthlyRevenue.push(revenueInMonth);
                monthlyOrders.push(ordersInMonth.length);
            }
        } else if (timeFilter === 'custom' && startDate && endDate) {
            // Dynamic based on date range
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 1) {
                // Hourly for single day
                for (let hour = 0; hour < 24; hour++) {
                    const startOfHour = new Date(start.getFullYear(), start.getMonth(), start.getDate(), hour, 0, 0);
                    const endOfHour = new Date(start.getFullYear(), start.getMonth(), start.getDate(), hour, 59, 59, 999);
                    
                    labels.push(`${hour}:00`);
                    
                    const ordersInHour = await Order.find({
                        createdOn: { $gte: startOfHour, $lte: endOfHour },
                        status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                    }).catch(() => []);
                    
                    let revenueInHour = 0;
                    ordersInHour.forEach(order => {
                        revenueInHour += order.finalAmount || 0;
                    });
                    
                    monthlyRevenue.push(revenueInHour);
                    monthlyOrders.push(ordersInHour.length);
                }
            } else if (diffDays <= 31) {
                // Daily for up to 31 days
                for (let i = 0; i <= diffDays; i++) {
                    const date = new Date(start);
                    date.setDate(start.getDate() + i);
                    
                    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
                    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
                    
                    labels.push(date.toLocaleDateString('default', { month: 'short', day: 'numeric' }));
                    
                    const ordersInDay = await Order.find({
                        createdOn: { $gte: startOfDay, $lte: endOfDay },
                        status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                    }).catch(() => []);
                    
                    let revenueInDay = 0;
                    ordersInDay.forEach(order => {
                        revenueInDay += order.finalAmount || 0;
                    });
                    
                    monthlyRevenue.push(revenueInDay);
                    monthlyOrders.push(ordersInDay.length);
                }
            } else {
                // Monthly for longer ranges
                const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
                const endMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
                
                let currentMonth = new Date(startMonth);
                while (currentMonth <= endMonth) {
                    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
                    
                    labels.push(currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' }));
                    
                    const ordersInMonth = await Order.find({
                        createdOn: { $gte: startOfMonth, $lte: endOfMonth },
                        status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                    }).catch(() => []);
                    
                    let revenueInMonth = 0;
                    ordersInMonth.forEach(order => {
                        revenueInMonth += order.finalAmount || 0;
                    });
                    
                    monthlyRevenue.push(revenueInMonth);
                    monthlyOrders.push(ordersInMonth.length);
                    
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                }
            }
        } else {
            // Default: Last 6 months starting from April 2025
            const startYear = 2025;
            const startMonth = 3; // April (0-indexed)
            
            for (let i = 0; i < 6; i++) {
                const date = new Date(startYear, startMonth + i, 1);
                const month = date.toLocaleString('default', { month: 'short' });
                const year = date.getFullYear();
                
                labels.push(`${month} ${year}`);
                
                const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
                
                let revenueInMonth = 0;
                let ordersInMonth = 0;
                
                if (startOfMonth <= new Date()) {
                    const ordersInMonthData = await Order.find({
                        createdOn: { $gte: startOfMonth, $lte: endOfMonth },
                        status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] }
                    }).catch(() => []);
                    
                    ordersInMonthData.forEach(order => {
                        revenueInMonth += order.finalAmount || 0;
                    });
                    
                    ordersInMonth = ordersInMonthData.length;
                } else {
                    const baseRevenue = 200000 + Math.random() * 100000;
                    const growthFactor = 1.1 + (Math.random() * 0.2);
                    
                    revenueInMonth = baseRevenue * Math.pow(growthFactor, i);
                    ordersInMonth = Math.floor(revenueInMonth / 2000);
                }
                
                monthlyRevenue.push(revenueInMonth);
                monthlyOrders.push(ordersInMonth);
            }
        }

        // Get payment method statistics with filters
        const paymentStats = await Order.aggregate([
            { $match: { 
                ...combinedFilter, 
                status: { $nin: ['Cancelled', 'Returned', 'Payment failed'] } 
            }},
            { $group: { 
                _id: '$orderType', 
                count: { $sum: 1 },
                amount: { $sum: '$finalAmount' }
            }}
        ]).catch(() => []);

        const paymentMethods = {
            cod: { count: 0, amount: 0 },
            razorPay: { count: 0, amount: 0 },
            wallet: { count: 0, amount: 0 }
        };

        paymentStats.forEach(stat => {
            if (paymentMethods[stat._id]) {
                paymentMethods[stat._id].count = stat.count;
                paymentMethods[stat._id].amount = stat.amount;
            }
        });

        // Get top 5 selling products with filters
        const topProducts = await Order.aggregate([
            { $match: { 
                ...combinedFilter,
                status: 'Delivered' 
            }},
            { $unwind: '$orderedItems' },
            { $group: {
                _id: '$orderedItems.product',
                totalQuantity: { $sum: '$orderedItems.quantity' },
                totalSales: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } },
                productName: { $first: '$orderedItems.name' }
            }},
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]).catch(() => []);

        // Get recent orders (last 10) with filters and sorting
        const sortField = sortBy || 'createdOn';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;

        let recentOrders = [];
        try {
            recentOrders = await Order.find(combinedFilter)
                .sort({ [sortField]: sortDirection })
                .limit(10)
                .populate('userId', 'name email')
                .lean();
        } catch (err) {
            console.error('Error fetching recent orders:', err);
            recentOrders = []; // Fallback to empty array
        }

        // Category-wise sales with filters
        const categorySales = await Order.aggregate([
            { $match: { 
                ...combinedFilter,
                status: 'Delivered' 
            }},
            { $unwind: '$orderedItems' },
            { $lookup: {
                from: 'products',
                localField: 'orderedItems.product',
                foreignField: '_id',
                as: 'productDetail'
            }},
            { $unwind: '$productDetail' },
            { $lookup: {
                from: 'categories',
                localField: 'productDetail.category',
                foreignField: '_id',
                as: 'categoryDetail'
            }},
            { $unwind: '$categoryDetail' },
            { $group: {
                _id: '$categoryDetail._id',
                categoryName: { $first: '$categoryDetail.name' },
                totalSales: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } },
                count: { $sum: 1 }
            }},
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]).catch(() => []);

        // Order status statistics with date filter
        const orderStatusStats = await Order.aggregate([
            { $match: dateFilter },
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]).catch(() => []);

        const orderStatusCounts = {
            Pending: 0,
            Processing: 0,
            Shipped: 0,
            Delivered: 0,
            Cancelled: 0,
            'Return Request': 0,
            Returned: 0
        };

        orderStatusStats.forEach(stat => {
            if (orderStatusCounts.hasOwnProperty(stat._id)) {
                orderStatusCounts[stat._id] = stat.count;
            }
        });

        // Calculate Active vs Inactive Products
        const activeProducts = await Product.countDocuments({ isBlocked: false, isDeleted: false }).catch(() => 0);
        const inactiveProducts = await Product.countDocuments({ $or: [{ isBlocked: true }, { isDeleted: true }] }).catch(() => 0);

        // Calculate conversion rate (orders / total users)
        const uniqueOrderUsers = await Order.distinct('userId', dateFilter).catch(() => []);
        const conversionRate = totalUsers > 0 ? (uniqueOrderUsers.length / totalUsers) * 100 : 0;

        res.render('dashboard', {
            totalUsers,
            totalProducts,
            totalCategories,
            totalOrders,
            totalRevenue,
            pendingRevenue,
            deliveredRevenue,
            cancelledRevenue,
            last6Months: labels,
            monthlyRevenue,
            monthlyOrders,
            paymentMethods,
            topProducts,
            recentOrders,
            categorySales,
            orderStatusCounts,
            activeProducts,
            inactiveProducts,
            conversionRate,
            timeFilter,
            startDate,
            endDate,
            orderStatus,
            sortBy,
            sortOrder
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.redirect('/admin/pageError');
    }
};

module.exports = {
    pageError,
    loadLogin,
    login,
    logout,
    salesReport,
    exportToPDF,
    exportToExcel,
    loadDashboard
};  