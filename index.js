// index.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "data", "patients.json");

// get patients data
async function getPatients() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

// filter and sort
const filterAndSortPatients = (patients, query) => {
  let filtered = [...patients];

  // Search by name or patientId
  if (query.search) {
    const s = query.search.toLowerCase();
    filtered = filtered.filter(p =>
      (p.name && p.name.toLowerCase().includes(s)) ||
      (p.patientId && p.patientId.toLowerCase().includes(s))
    );
  }

  // status filter
  if (query.status && query.status !== 'all') {
    filtered = filtered.filter(p => p.status === query.status);
  }

  return filtered;
};

// GET /patients
app.get('/patients', async (req, res) => {
  try {
    const data = await getPatients();
    const {
      search,
      status,
      page = 1,
      limit = 10
    } = req.query;

    const filtered = filterAndSortPatients(data.patients, {
      search, status
    });

    const pageInt = Math.max(parseInt(page) || 1, 1);
    const limitInt = Math.max(parseInt(limit) || 10, 1);
    const startIndex = (pageInt - 1) * limitInt;
    const endIndex = startIndex + limitInt;

    const paginated = filtered.slice(startIndex, endIndex);

    const stats = {
      total: data.patients.length,
      assigned: data.patients.filter(p => p.status === 'assigned').length,
      unassigned: data.patients.filter(p => p.status === 'unassigned').length,
      totalSurgeries: data.patients.filter(p => p.hasSurgery === true).length,
      filteredTotal: filtered.length
    };

    res.json({
      success: true,
      data: paginated,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(filtered.length / limitInt),
        totalItems: filtered.length,
        itemsPerPage: limitInt
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// GET /patients/:id
app.get('/patients/:id', async (req, res) => {
  try {
    const data = await getPatients();
    const id = req.params.id;
    const patient = data.patients.find(p => p._id === id || p.patientId === id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
