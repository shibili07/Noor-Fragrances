const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const Order = require("../../models/orderSchema")
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const pdfmake = require('pdfmake');
const ExcelJS = require('exceljs');

const pageError = async(req,res)=>{
    res.render("admin-error")
}

const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin")
    }else{
        return res.render("admin-login")
    }
    
}


const login = async (req,res) =>{
    try {
        
        const {email,password}=req.body
       
        const admin = await User.findOne({isAdmin:true,email})

        if(!admin){
            return res.status(404).json({success:false,message:"Invalid Email!"})
        }
        console.log(password);
        
        const passwordMatch = await bcrypt.compare(password,admin.password)
        if(!passwordMatch){
            return res.status(404).json({success:false,message:"Invalid Password!"})
        }

        req.session.admin = true 
        
        if(req.session.admin){
           return res.status(200).json({success:true,message:"Admin Logged Successfully!"})
        }else{
            return res.status(404).json({success:false,message:"Admin Does not Exist"})  
        }

    }catch(error) {
        return res.status(500).json({success:false,message:"Internal Server Error!"})
    }
}


const logout = async(req,res)=>{
    try {
        if (req.session.admin) {
            delete req.session.admin;
        }
        
        res.redirect("/admin/login");
        
    } catch (error) {
        console.log("unexpected error during logout",error);
        res.redirect("/pageError")
        
        
    }
    
}
const salesReport = async (req, res) => {
    try {
        const { dateRange, startDate, endDate, page = 1, sort = 'desc', sortField = 'createdOn', orderId } = req.query;
        const perPage = 10;
        const skip = (page - 1) * perPage;

        // Build query
        let query = {};
        
        // Exclude "Payment failed" orders
        query.status = { $ne: 'Payment failed' };

        // Date filter
        if (dateRange) {
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    query.createdOn = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    query.createdOn = {
                        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - now.getDay());
                    query.createdOn = {
                        $gte: weekStart,
                        $lte: now
                    };
                    break;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    query.createdOn = {
                        $gte: monthStart,
                        $lte: now
                    };
                    break;
                case 'year':
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    query.createdOn = {
                        $gte: yearStart,
                        $lte: now
                    };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        query.createdOn = {
                            $gte: new Date(startDate),
                            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                        };
                    }
                    break;
            }
        }

        // Order ID search
        if (orderId) {
            query.orderId = { $regex: orderId, $options: 'i' };
        }

        // Sort
        const sortOrder = sort === 'asc' ? 1 : -1;
        const sortQuery = { [sortField]: sortOrder };

        // Fetch orders
        const orders = await Order.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(perPage)
            .populate('userId', 'name email')
            .lean();

        // Calculate total orders count for pagination
        const totalOrdersCount = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrdersCount / perPage);

        // Calculate sales summary
        const allOrders = await Order.find(query).lean();

        const summary = {
            grossSales: 0,
            returns: 0,
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
            // Gross Sales: Total sales before deductions
            summary.grossSales += order.totalPrice || 0;

            // Returns: Only include 'Returned' orders
            if (order.status === 'Returned') {
                summary.returns += order.finalAmount || 0;
            }

            // Coupons and Discounts
            summary.couponsRedeemed += order.couponDiscount || 0;
            summary.discounts += order.offerDiscount || 0;

            // Net Sales: Sum of paymentAmount for Delivered orders only
            if (order.status === 'Delivered') {
                summary.netSales += order.finalAmount || 0;
            }

            // Order Types count
            if (order.orderType) {
                summary.orderTypes[order.orderType] = (summary.orderTypes[order.orderType] || 0) + 1;
            }
        });

        return res.render("saleReport", {
            orders,
            summary,
            currentPage: parseInt(page),
            totalPages,
            dateRange,
            startDate,
            endDate,
            sort,
            sortField,
            orderId
        });
    } catch (error) {
        console.error('Sales Report Error:', error);
        return res.status(500).render('error', {
            message: 'Error generating sales report',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const exportToPDF = async (req, res) => {
    try {
        const { dateRange, startDate, endDate, orderId } = req.query;
        let query = {};

        // Exclude "Payment failed" orders
        query.status = { $ne: 'Payment failed' };

        // Apply date filtering
        if (dateRange) {
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    query.createdOn = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    query.createdOn = {
                        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
                    };
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - now.getDay());
                    query.createdOn = {
                        $gte: weekStart,
                        $lte: now
                    };
                    break;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    query.createdOn = {
                        $gte: monthStart,
                        $lte: now
                    };
                    break;
                case 'year':
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    query.createdOn = {
                        $gte: yearStart,
                        $lte: now
                    };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        query.createdOn = {
                            $gte: new Date(startDate),
                            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                        };
                    }
                    break;
            }
        }

        // Order ID search
        if (orderId) {
            query.orderId = { $regex: orderId, $options: 'i' };
        }

        const orders = await Order.find(query).sort({ createdOn: -1 }).lean();

        // Calculate summary
        const summary = {
            grossSales: 0,
            couponsRedeemed: 0,
            discounts: 0,
            netSales: 0,
            totalOrders: orders.length,
            orderTypes: { razorPay: 0, cod: 0, wallet: 0 }
        };

        orders.forEach(order => {
            summary.grossSales += order.totalPrice || 0;
            summary.couponsRedeemed += order.couponDiscount || 0;
            summary.discounts += order.offerDiscount || 0;
            if (order.status === 'Delivered') {
                summary.netSales += order.finalAmount || 0;
            }
            if (order.orderType) {
                summary.orderTypes[order.orderType] = (summary.orderTypes[order.orderType] || 0) + 1;
            }
        });

        // Generate PDF (unchanged from original, included for completeness)
        const fonts = {
            Roboto: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };

        const printer = new pdfmake(fonts);

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            header: {
                text: 'Noor Fragrance Sales Report',
                alignment: 'center',
                margin: [0, 20, 0, 0],
                fontSize: 16,
                bold: true,
                color: '#1c2526'
            },
            footer: (currentPage, pageCount) => ({
                text: `Page ${currentPage} of ${pageCount}`,
                alignment: 'center',
                margin: [0, 30, 0, 0],
                fontSize: 10,
                color: '#6c757d'
            }),
            content: [
                {
                    text: `Date Range: ${dateRange || 'All'}${dateRange === 'custom' && startDate && endDate ? 
                        ` (${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')})` : ''}${orderId ? ` | Order ID: ${orderId}` : ''}`,
                    style: 'subheader'
                },
                { text: '\n' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'Order ID', style: 'tableHeader' },
                                { text: 'Amount', style: 'tableHeader' },
                                { text: 'Discount', style: 'tableHeader' },
                                { text: 'Coupon', style: 'tableHeader' },
                                { text: 'Final Amount', style: 'tableHeader' },
                                { text: 'Status', style: 'tableHeader' },
                                { text: 'Order Type', style: 'tableHeader' }
                            ],
                            ...orders.map(order => [
                                order.orderId,
                                `Rs ${(order.totalPrice || 0).toLocaleString('en-IN')}`,
                                `Rs ${(order.offerDiscount || 0).toLocaleString('en-IN')}`,
                                `Rs ${(order.couponDiscount || 0).toLocaleString('en-IN')}`,
                                `Rs ${(order.finalAmount || 0).toLocaleString('en-IN')}`,
                                order.status,
                                order.orderType
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#dee2e6',
                        vLineColor: () => '#dee2e6',
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 8,
                        paddingBottom: () => 8
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
                                { text: summary.totalOrders.toString(), style: 'summaryValue' }
                            ],
                            [
                                { text: 'Gross Sales', style: 'summaryLabel' },
                                { text: `Rs ${summary.grossSales.toLocaleString('en-IN')}`, style: 'summaryValue' }
                            ],
                            [
                                { text: 'Coupons Redeemed', style: 'summaryLabel' },
                                { text: `Rs ${summary.couponsRedeemed.toLocaleString('en-IN')}`, style: 'summaryValue' }
                            ],
                            [
                                { text: 'Discounts', style: 'summaryLabel' },
                                { text: `Rs ${summary.discounts.toLocaleString('en-IN')}`, style: 'summaryValue' }
                            ],
                            [
                                { text: 'Net Sales', style: 'summaryLabel' },
                                { text: `Rs ${summary.netSales.toLocaleString('en-IN')}`, style: 'summaryValue' }
                            ],
                            [
                                { text: 'RazorPay Orders', style: 'summaryLabel' },
                                { text: summary.orderTypes.razorPay.toString(), style: 'summaryValue' }
                            ],
                            [
                                { text: 'COD Orders', style: 'summaryLabel' },
                                { text: summary.orderTypes.cod.toString(), style: 'summaryValue' }
                            ],
                            [
                                { text: 'Wallet Orders', style: 'summaryLabel' },
                                { text: summary.orderTypes.wallet.toString(), style: 'summaryValue' }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#dee2e6',
                        vLineColor: () => '#dee2e6',
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 8,
                        paddingBottom: () => 8
                    }
                }
            ],
            styles: {
                header: {
                    fontSize: 20,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 20, 0, 10],
                    color: '#1c2526'
                },
                subheader: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 20, 0, 10],
                    color: '#5e5ce6'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 12,
                    color: 'white',
                    fillColor: '#5e5ce6',
                    alignment: 'center'
                },
                summaryLabel: {
                    bold: true,
                    fontSize: 12,
                    color: '#1c2526'
                },
                summaryValue: {
                    fontSize: 12,
                    alignment: 'right',
                    color: '#1c2526'
                }
            },
            defaultStyle: {
                fontSize: 10,
                color: '#1c2526'
            },
            background: [
                {
                    canvas: [
                        {
                            type: 'rect',
                            x: 0,
                            y: 0,
                            w: 595.28,
                            h: 841.89,
                            color: '#f8f9fa'
                        }
                    ]
                }
            ]
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString()}.pdf`);
        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF report: ' + error.message);
    }
};
const exportToExcel = async (req, res) => {
    try {
        const { dateRange, startDate, endDate, orderId } = req.query;
        let query = {};

        // Exclude "Payment failed" orders
        query.status = { $ne: 'Payment failed' };

        // Apply date filtering
        if (dateRange) {
            const now = new Date();
            switch (dateRange) {
                case 'today':
                    query.createdOn = {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lte: new Date(now.setHours(23, 59, 59, 999)),
                    };
                    break;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    query.createdOn = {
                        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                        $lte: new Date(yesterday.setHours(23, 59, 59, 999)),
                    };
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(weekStart.getDate() - now.getDay());
                    query.createdOn = {
                        $gte: weekStart,
                        $lte: now,
                    };
                    break;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    query.createdOn = {
                        $gte: monthStart,
                        $lte: now,
                    };
                    break;
                case 'year':
                    const yearStart = new Date(now.getFullYear(), 0, 1);
                    query.createdOn = {
                        $gte: yearStart,
                        $lte: now,
                    };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        query.createdOn = {
                            $gte: new Date(startDate),
                            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
                        };
                    }
                    break;
            }
        }

        // Order ID search
        if (orderId) {
            query.orderId = { $regex: orderId, $options: 'i' };
        }

        const orders = await Order.find(query).sort({ createdOn: -1 }).lean();

        // Calculate summary
        const summary = {
            grossSales: 0,
            couponsRedeemed: 0,
            discounts: 0,
            netSales: 0,
            totalOrders: orders.length,
            orderTypes: { razorPay: 0, cod: 0, wallet: 0 },
        };

        orders.forEach((order) => {
            summary.grossSales += order.totalPrice || 0;
            summary.couponsRedeemed += order.couponDiscount || 0;
            summary.discounts += order.offerDiscount || 0;
            if (order.status === 'Delivered') {
                summary.netSales += order.finalAmount || 0;
            }
            if (order.orderType) {
                summary.orderTypes[order.orderType] = (summary.orderTypes[order.orderType] || 0) + 1;
            }
        });

        // Generate Excel (unchanged from original, included for completeness)
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Noor Fragrance';
        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet = workbook.addWorksheet('Sales Report', {
            properties: { tabColor: { argb: 'FF0000FF' } },
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
        });

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 15, style: { font: { bold: true } } },
            { header: 'Amount', key: 'amount', width: 15, style: { numFmt: '"Rs "#,##0.00' } },
            { header: 'Discount', key: 'discount', width: 15, style: { numFmt: '"Rs "#,##0.00' } },
            { header: 'Coupon', key: 'coupon', width: 15, style: { numFmt: '"Rs "#,##0.00' } },
            { header: 'Final Amount', key: 'finalAmount', width: 15, style: { numFmt: '"Rs "#,##0.00' } },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Order Type', key: 'orderType', width: 15 },
        ];

        // Add title and date range
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'Sales Report';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

        if (dateRange || orderId) {
            worksheet.mergeCells('A2:G2');
            const dateRangeCell = worksheet.getCell('A2');
            dateRangeCell.value = `Date Range: ${dateRange || 'All'}${
                dateRange === 'custom' && startDate && endDate
                    ? ` (${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')})`
                    : ''
            }${orderId ? ` | Order ID: ${orderId}` : ''}`;
            dateRangeCell.font = { bold: true, color: { argb: 'FF000000' } };
            dateRangeCell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        // Style the header row
        const headerRow = worksheet.getRow(4);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5E5CE6' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 20;

        // Add data rows
        orders.forEach((order) => {
            const row = worksheet.addRow({
                orderId: order.orderId,
                amount: order.totalPrice || 0,
                discount: order.offerDiscount || 0,
                coupon: order.couponDiscount || 0,
                finalAmount: order.finalAmount || 0,
                status: order.status,
                orderType: order.orderType,
            });
            row.alignment = { vertical: 'middle' };
            row.height = 20;
            for (let i = 1; i <= 7; i++) {
                const cell = row.getCell(i);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            }
        });

        // Add summary section
        const lastRow = worksheet.rowCount;
        worksheet.mergeCells(`A${lastRow + 2}:G${lastRow + 2}`);
        const summaryTitleCell = worksheet.getCell(`A${lastRow + 2}`);
        summaryTitleCell.value = 'Summary';
        summaryTitleCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
        summaryTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        summaryTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

        const summaryData = [
            { label: 'Total Orders', value: summary.totalOrders, isCurrency: false },
            { label: 'Gross Sales', value: summary.grossSales, isCurrency: true },
            { label: 'Coupons Redeemed', value: summary.couponsRedeemed, isCurrency: true },
            { label: 'Discounts', value: summary.discounts, isCurrency: true },
            { label: 'Net Sales', value: summary.netSales, isCurrency: true },
            { label: 'RazorPay Orders', value: summary.orderTypes.razorPay, isCurrency: false },
            { label: 'COD Orders', value: summary.orderTypes.cod, isCurrency: false },
            { label: 'Wallet Orders', value: summary.orderTypes.wallet, isCurrency: false },
        ];

        summaryData.forEach(({ label, value, isCurrency }, index) => {
            const row = worksheet.addRow([label, value]);
            row.getCell(1).font = { bold: true };
            if (isCurrency) {
                row.getCell(2).numFmt = '"Rs "#,##0.00';
            }
            row.alignment = { vertical: 'middle' };
            row.height = 20;
            row.getCell(1).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
            row.getCell(2).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).json({ success: false, error: 'Error generating Excel report: ' + error.message });
    }
};
  



const loadDashboard = async (req, res) => {
    try {
        // Get filter parameters from query
        const { timeFilter = 'all', startDate, endDate, orderStatus, sortBy = 'createdOn', sortOrder = 'desc' } = req.query;

        // Get counts for key metrics
        const totalUsers = await User.countDocuments({ isAdmin: false }) || 0;
        const totalProducts = await Product.countDocuments({ isDeleted: false }) || 0;
        const totalOrders = await Order.countDocuments({ status: { $ne: 'Payment failed' } }) || 0;

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
                    dateFilter = {
                        createdOn: {
                            $gte: new Date(2025, 0, 1),
                            $lte: new Date(2025, 11, 31, 23, 59, 59, 999)
                        }
                    };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        const startDateTime = new Date(startDate.split('/').reverse().join('-'));
                        const endDateTime = new Date(endDate.split('/').reverse().join('-'));
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
        let orderFilter = { status: { $ne: 'Payment failed' } };
        if (orderStatus && orderStatus !== 'all') {
            orderFilter.status = orderStatus;
        }

        // Combine filters
        const combinedFilter = { ...dateFilter, ...orderFilter };

        // Revenue metrics (only for Delivered orders)
        const allOrders = await Order.find({ ...combinedFilter, status: 'Delivered' }).catch(() => []);
        let totalRevenue = 0;

        allOrders.forEach(order => {
            totalRevenue += order.finalAmount || 0;
        });

        // Dynamic time-based revenue and order data
        let labels = [];
        let monthlyRevenue = [];
        let monthlyOrders = [];

        const now = new Date();
        if (timeFilter === 'today') {
            for (let hour = 0; hour < 24; hour++) {
                const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
                const endOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 59, 59, 999);
                labels.push(`${hour}:00`);
                const ordersInHour = await Order.find({
                    createdOn: { $gte: startOfHour, $lte: endOfHour },
                    status: 'Delivered'
                }).catch(() => []);
                let revenueInHour = 0;
                ordersInHour.forEach(order => {
                    revenueInHour += order.finalAmount || 0;
                });
                monthlyRevenue.push(revenueInHour);
                monthlyOrders.push(ordersInHour.length);
            }
        } else if (timeFilter === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            for (let hour = 0; hour < 24; hour++) {
                const startOfHour = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hour, 0, 0);
                const endOfHour = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hour, 59, 59, 999);
                labels.push(`${hour}:00`);
                const ordersInHour = await Order.find({
                    createdOn: { $gte: startOfHour, $lte: endOfHour },
                    status: 'Delivered'
                }).catch(() => []);
                let revenueInHour = 0;
                ordersInHour.forEach(order => {
                    revenueInHour += order.finalAmount || 0;
                });
                monthlyRevenue.push(revenueInHour);
                monthlyOrders.push(ordersInHour.length);
            }
        } else if (timeFilter === 'week') {
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
                    status: 'Delivered'
                }).catch(() => []);
                let revenueInDay = 0;
                ordersInDay.forEach(order => {
                    revenueInDay += order.finalAmount || 0;
                });
                monthlyRevenue.push(revenueInDay);
                monthlyOrders.push(ordersInDay.length);
            }
        } else if (timeFilter === 'month') {
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
                    status: 'Delivered'
                }).catch(() => []);
                let revenueInDay = 0;
                ordersInDay.forEach(order => {
                    revenueInDay += order.finalAmount || 0;
                });
                monthlyRevenue.push(revenueInDay);
                monthlyOrders.push(ordersInDay.length);
            }
        } else if (timeFilter === 'year' || timeFilter === 'all' || timeFilter === 'custom') {
            // Yearly data for 2025–2030
            for (let year = 2025; year <= 2030; year++) {
                const startOfYear = new Date(year, 0, 1);
                const endOfYear = new Date(year, 11, 31, 23, 59, 59);
                labels.push(year.toString());
                const ordersInYear = await Order.find({
                    createdOn: { $gte: startOfYear, $lte: endOfYear },
                    status: 'Delivered'
                }).catch(() => []);
                let revenueInYear = 0;
                ordersInYear.forEach(order => {
                    revenueInYear += order.finalAmount || 0;
                });
                monthlyRevenue.push(revenueInYear);
                monthlyOrders.push(ordersInYear.length);
            }
        }

        // Get payment method statistics with filters
        const paymentStats = await Order.aggregate([
            { $match: { ...combinedFilter, status: 'Delivered' } },
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

        // Get top 5 selling products
        const topProducts = await Order.aggregate([
            { $match: { ...combinedFilter, status: 'Delivered' } },
            { $unwind: '$orderedItems' },
            { $group: {
                _id: '$orderedItems.product',
                totalQuantity: { $sum: '$orderedItems.quantity' },
                totalSales: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } },
                productName: { $first: '$orderedItems.name' }
            }},
            { $sort: { totalSales: -1 } },
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
            recentOrders = [];
        }

        // Category-wise sales
        const categorySales = await Order.aggregate([
            { $match: { ...combinedFilter, status: 'Delivered' } },
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
                totalSales: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } }
            }},
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]).catch(() => []);

        // Order status statistics
        const orderStatusStats = await Order.aggregate([
            { $match: { ...dateFilter, status: { $ne: 'Payment failed' } } },
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
            Returned: 0,
            'Cancel requested': 0,
            'Return Rejected': 0
        };

        orderStatusStats.forEach(stat => {
            if (orderStatusCounts.hasOwnProperty(stat._id)) {
                orderStatusCounts[stat._id] = stat.count;
            }
        });

        // Calculate Active vs Inactive Products
        const activeProducts = await Product.countDocuments({ isBlocked: false, isDeleted: false }).catch(() => 0);
        const inactiveProducts = await Product.countDocuments({ $or: [{ isBlocked: true }, { isDeleted: true }] }).catch(() => 0);

        // Calculate conversion rate
        const uniqueOrderUsers = await Order.distinct('userId', { ...dateFilter, status: { $ne: 'Payment failed' } }).catch(() => []);
        const conversionRate = totalUsers > 0 ? (uniqueOrderUsers.length / totalUsers) * 100 : 0;

        res.render('dashboard', {
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
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