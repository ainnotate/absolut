const { db } = require('../models/database');
const XLSX = require('xlsx');

// Export QC Results as Excel
const exportQCResults = async (req, res) => {
  try {
    const {
      locale,
      deliverableType,
      qcStatus,
      bookingCategory,
      dateFrom,
      dateTo
    } = req.query;

    // Build the SQL query with filters
    let query = `
      SELECT 
        a.asset_id,
        a.deliverable_type,
        a.metadata,
        a.created_date,
        a.qc_status,
        a.qc_completed_date,
        a.qc_notes,
        a.send_to_supervisor,
        a.supervisor_notes,
        u.username as uploader_username,
        u.id as user_id,
        qc_user.username as qc_completed_by_username,
        supervisor_user.username as supervisor_reviewed_by_username,
        up.filename,
        ROW_NUMBER() OVER (PARTITION BY a.asset_id ORDER BY up.filename) as image_number
      FROM assets a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN users qc_user ON a.qc_completed_by = qc_user.id
      LEFT JOIN users supervisor_user ON a.supervisor_id = supervisor_user.id
      LEFT JOIN uploads up ON a.asset_id = up.asset_id
      WHERE 1=1
    `;

    const params = [];

    // Add filters
    if (locale) {
      query += ` AND JSON_EXTRACT(a.metadata, '$.locale') = ?`;
      params.push(locale);
    }

    if (deliverableType) {
      query += ` AND a.deliverable_type = ?`;
      params.push(deliverableType);
    }

    if (qcStatus) {
      query += ` AND a.qc_status = ?`;
      params.push(qcStatus);
    }

    if (bookingCategory) {
      query += ` AND (JSON_EXTRACT(a.metadata, '$.bookingCategory') LIKE ? OR JSON_EXTRACT(a.metadata, '$.bookingCategory') = ?)`;
      params.push(`%${bookingCategory}%`, bookingCategory);
    }

    if (dateFrom) {
      query += ` AND DATE(a.created_date) >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND DATE(a.created_date) <= ?`;
      params.push(dateTo);
    }

    // Only include assets with QC data (completed QC process)
    query += ` AND a.qc_status IS NOT NULL`;
    query += ` ORDER BY a.created_date DESC, a.asset_id, up.filename`;

    db.all(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching QC results:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch QC results'
        });
      }

      // Process the data for Excel export
      const excelData = results.map(row => {
        const metadata = row.metadata ? JSON.parse(row.metadata) : {};
        
        return {
          asset_id: row.asset_id,
          image_number: row.image_number,
          locale: metadata.locale || '',
          file_name: row.filename || '',
          Deliverable_Type: row.deliverable_type,
          booking_category_original: metadata.bookingCategory || '',
          booking_category_final: metadata.bookingCategory || '', // Same as original for now
          Source_name: metadata.sourceName || '',
          booking_category: metadata.bookingCategory || '',
          User_id: row.user_id,
          asset_status: row.qc_status,
          asset_reject_reason: row.qc_notes || '',
          consultation_requested: row.send_to_supervisor ? 'Yes' : 'No',
          supervisor_status: row.supervisor_notes ? 'Reviewed' : '',
          supervisor_notes: row.supervisor_notes || '',
          assigned_to_username: row.uploader_username,
          assigned_date: row.created_date,
          qc_completed_by_username: row.qc_completed_by_username || '',
          qc_completed_date: row.qc_completed_date || '',
          qc_status: row.qc_status,
          supervisor_reviewed_by_username: row.supervisor_reviewed_by_username || '',
          supervisor_reviewed_date: row.qc_completed_date || '' // Using QC date as placeholder
        };
      });

      // Create Excel workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'QC Results');

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx' 
      });

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0];
      const filename = `QC_Results_${today}.xlsx`;

      // Set response headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);

      // Send the Excel file
      res.send(excelBuffer);
    });

  } catch (error) {
    console.error('Error in exportQCResults:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during export'
    });
  }
};

// Get export statistics
const getExportStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_assets,
        COUNT(CASE WHEN qc_status IS NOT NULL THEN 1 END) as assets_with_qc,
        COUNT(CASE WHEN qc_status = 'approved' THEN 1 END) as approved_assets,
        COUNT(CASE WHEN qc_status = 'rejected' THEN 1 END) as rejected_assets,
        COUNT(CASE WHEN send_to_supervisor = 1 THEN 1 END) as consulted_assets
      FROM assets
    `;

    db.get(query, [], (err, stats) => {
      if (err) {
        console.error('Error fetching export stats:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch export statistics'
        });
      }

      res.json({
        success: true,
        stats
      });
    });

  } catch (error) {
    console.error('Error in getExportStats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get filter options for export
const getExportFilterOptions = async (req, res) => {
  try {
    // Get unique locales
    const localeQuery = `
      SELECT DISTINCT JSON_EXTRACT(metadata, '$.locale') as locale 
      FROM assets 
      WHERE JSON_EXTRACT(metadata, '$.locale') IS NOT NULL 
      AND JSON_EXTRACT(metadata, '$.locale') != ''
      ORDER BY locale
    `;

    // Get unique booking categories
    const categoryQuery = `
      SELECT DISTINCT JSON_EXTRACT(metadata, '$.bookingCategory') as booking_category 
      FROM assets 
      WHERE JSON_EXTRACT(metadata, '$.bookingCategory') IS NOT NULL 
      AND JSON_EXTRACT(metadata, '$.bookingCategory') != ''
      ORDER BY booking_category
    `;

    // Get unique deliverable types
    const deliverableQuery = `
      SELECT DISTINCT deliverable_type 
      FROM assets 
      WHERE deliverable_type IS NOT NULL 
      AND deliverable_type != ''
      ORDER BY deliverable_type
    `;

    db.all(localeQuery, [], (err, locales) => {
      if (err) {
        console.error('Error fetching locales:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch filter options'
        });
      }

      db.all(categoryQuery, [], (err, categories) => {
        if (err) {
          console.error('Error fetching categories:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch filter options'
          });
        }

        db.all(deliverableQuery, [], (err, deliverableTypes) => {
          if (err) {
            console.error('Error fetching deliverable types:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to fetch filter options'
            });
          }

          res.json({
            success: true,
            data: {
              locales: locales.map(row => row.locale).filter(Boolean),
              bookingCategories: categories.map(row => row.booking_category).filter(Boolean),
              deliverableTypes: deliverableTypes.map(row => row.deliverable_type).filter(Boolean)
            }
          });
        });
      });
    });

  } catch (error) {
    console.error('Error in getExportFilterOptions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get progress tracking statistics
const getProgressStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND DATE(a.created_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_assets,
        COUNT(CASE WHEN a.qc_status = 'approved' THEN 1 END) as completed,
        ROUND(AVG(daily_completed.completed_per_day), 0) as average_per_day
      FROM assets a
      LEFT JOIN (
        SELECT 
          DATE(created_date) as date,
          COUNT(*) as completed_per_day
        FROM assets
        WHERE qc_status = 'approved'
        GROUP BY DATE(created_date)
      ) daily_completed ON 1=1
      WHERE 1=1 ${dateFilter}
    `;

    db.get(statsQuery, params, (err, stats) => {
      if (err) {
        console.error('Error fetching progress stats:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch progress statistics'
        });
      }

      res.json({
        success: true,
        data: {
          totalAssets: stats.total_assets || 0,
          completed: stats.completed || 0,
          averagePerDay: stats.average_per_day || 0
        }
      });
    });

  } catch (error) {
    console.error('Error in getProgressStats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get locale-wise progress data
const getLocaleProgress = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND DATE(a.created_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        JSON_EXTRACT(metadata, '$.locale') as locale,
        COUNT(*) as total,
        COUNT(CASE WHEN qc_status = 'approved' THEN 1 END) as completed,
        COUNT(CASE WHEN qc_status != 'approved' OR qc_status IS NULL THEN 1 END) as remaining
      FROM assets a
      WHERE JSON_EXTRACT(metadata, '$.locale') IS NOT NULL 
      AND JSON_EXTRACT(metadata, '$.locale') != ''
      ${dateFilter}
      GROUP BY JSON_EXTRACT(metadata, '$.locale')
      ORDER BY locale
    `;

    db.all(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching locale progress:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch locale progress'
        });
      }

      res.json({
        success: true,
        data: results.map(row => ({
          locale: row.locale,
          total: row.total,
          completed: row.completed,
          remaining: row.remaining
        }))
      });
    });

  } catch (error) {
    console.error('Error in getLocaleProgress:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get date-wise completion data
const getDateProgress = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(qc_completed_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      // Default to last 30 days
      dateFilter = 'WHERE DATE(qc_completed_date) >= DATE("now", "-30 days")';
    }

    const query = `
      SELECT 
        DATE(qc_completed_date) as date,
        COUNT(*) as completed
      FROM assets
      ${dateFilter}
      AND qc_status = 'approved'
      AND qc_completed_date IS NOT NULL
      GROUP BY DATE(qc_completed_date)
      ORDER BY date DESC
      LIMIT 30
    `;

    db.all(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching date progress:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch date progress'
        });
      }

      res.json({
        success: true,
        data: results.reverse() // Show oldest to newest
      });
    });

  } catch (error) {
    console.error('Error in getDateProgress:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user performance data
const getUserPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND DATE(a.qc_completed_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        u.username,
        COUNT(CASE WHEN a.qc_status = 'approved' THEN 1 END) as completed,
        COUNT(CASE WHEN a.qc_status = 'pending' OR a.qc_status = 'in_review' THEN 1 END) as in_progress,
        COUNT(CASE WHEN a.qc_status IS NULL OR a.qc_status = 'rejected' THEN 1 END) as pending
      FROM users u
      LEFT JOIN assets a ON u.id = a.qc_completed_by
      WHERE u.role IN ('qc_user', 'supervisor', 'admin')
      AND u.username NOT IN ('admin', 'supervisor1')
      ${dateFilter}
      GROUP BY u.id, u.username
      HAVING (completed + in_progress + pending) > 0
      ORDER BY completed DESC
      LIMIT 20
    `;

    db.all(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching user performance:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch user performance'
        });
      }

      res.json({
        success: true,
        data: results
      });
    });

  } catch (error) {
    console.error('Error in getUserPerformance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  exportQCResults,
  getExportStats,
  getExportFilterOptions,
  getProgressStats,
  getLocaleProgress,
  getDateProgress,
  getUserPerformance
};