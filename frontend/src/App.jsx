/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Container, Tab, Tabs, Spinner, Alert, Row, Col, Card, Badge, Form, Button, ProgressBar } from 'react-bootstrap';

function App() {
  // Original static scan state
  const [nginxScan, setNginxScan] = useState(null);
  const [secureScan, setSecureScan] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [staticLoading, setStaticLoading] = useState(true);
  const [staticError, setStaticError] = useState(null);

  // Dynamic scan state
  const [activeScan, setActiveScan] = useState(null);
  const [completedScans, setCompletedScans] = useState([]);
  const [popularImages, setPopularImages] = useState([]);

  useEffect(() => {
    loadStaticScanData();
    loadPopularImages();
  }, []);

  const loadStaticScanData = async () => {
    try {
      setStaticLoading(true);
      setStaticError(null);

      console.log('Loading static scan data using Fetch API on port 5001...');

      const [nginxResponse, secureResponse, comparisonResponse] = await Promise.all([
        fetch('http://localhost:5001/api/scan/nginx-scan'),
        fetch('http://localhost:5001/api/scan/nginx-secure'),
        fetch('http://localhost:5001/api/compare/nginx-scan/nginx-secure')
      ]);

      if (!nginxResponse.ok || !secureResponse.ok || !comparisonResponse.ok) {
        throw new Error('One or more API requests failed');
      }

      const nginxData = await nginxResponse.json();
      const secureData = await secureResponse.json();
      const comparisonData = await comparisonResponse.json();

      console.log('nginx-scan response:', nginxData);
      console.log('nginx-secure response:', secureData);
      console.log('comparison response:', comparisonData);

      setNginxScan(nginxData);
      setSecureScan(secureData);
      setComparison(comparisonData);

    } catch (error) {
      console.error('Error loading static scan data:', error);
      setStaticError(`Failed to load demo data: ${error.message}`);
    } finally {
      setStaticLoading(false);
    }
  };

  const loadPopularImages = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/popular-images');
      if (response.ok) {
        const images = await response.json();
        setPopularImages(images);
      }
    } catch (err) {
      console.error('Failed to load popular images:', err);
    }
  };

  // Dynamic Scanner Component
  const DynamicScanner = ({ onScanStart }) => {
    const [imageName, setImageName] = useState('');
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);

    const handleScan = async () => {
      if (!imageName.trim()) return;

      setScanning(true);
      setError(null);

      try {
        const response = await fetch('http://localhost:5001/api/scan-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_name: imageName })
        });

        const data = await response.json();

        if (response.ok) {
          onScanStart(data.scan_id, imageName);
          setImageName('');
        } else {
          setError(data.error || 'Failed to start scan');
        }
      } catch (error) {
        setError('Network error: Unable to connect to API');
      } finally {
        setScanning(false);
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !scanning && imageName.trim()) {
        handleScan();
      }
    };

    return (
      <div className="d-flex justify-content-center mb-4">
        <Card className="shadow-sm" style={{ maxWidth: '600px', width: '100%' }}>
          <Card.Header className="bg-primary text-white text-center">
            <h4 className="mb-0">🐳 Dynamic Container Security Scanner</h4>
          </Card.Header>
          <Card.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="text-center w-100">
                <strong>Docker Image Name:</strong>
                <br />
                <small className="text-muted">
                  Enter any public Docker image (e.g., nginx:latest, python:3.11)
                </small>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., nginx:latest, python:3.11, redis:7-alpine"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={scanning}
                size="lg"
                className="text-center"
              />
            </Form.Group>

            <div className="d-grid gap-2 mb-4">
              <Button
                variant="primary"
                size="lg"
                onClick={handleScan}
                disabled={!imageName.trim() || scanning}
              >
                {scanning ? (
                  <>
                    <Spinner size="sm" className="me-2" animation="border" />
                    Starting Security Scan...
                  </>
                ) : (
                  <>🔍 Scan for Vulnerabilities</>
                )}
              </Button>
            </div>

            {popularImages.length > 0 && (
              <div className="text-center">
                <h6 className="text-muted mb-3"> Popular Images to Try:</h6>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  {popularImages.map(image => (
                    <Badge
                      key={image.name}
                      bg="outline-secondary"
                      className="p-2"
                      style={{ cursor: 'pointer', fontSize: '0.9em' }}
                      onClick={() => setImageName(image.name)}
                      title={image.description}
                    >
                      {image.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  };

  // Scan Progress Component
  const ScanProgress = ({ scanId, imageName, onScanComplete }) => {
    const [progress, setProgress] = useState({
      status: 'starting',
      progress: 0,
      message: 'Initializing...'
    });

    useEffect(() => {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:5001/api/scan-status/${scanId}`);
          const data = await response.json();
          setProgress(data);

          if (data.status === 'completed') {
            clearInterval(interval);
            const resultResponse = await fetch(`http://localhost:5001/api/scan-result/${scanId}`);
            const results = await resultResponse.json();
            onScanComplete(results);
          } else if (data.status === 'failed') {
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Failed to get scan status:', error);
        }
      }, 2000);

      return () => clearInterval(interval);
    }, [scanId, onScanComplete]);

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed': return 'success';
        case 'failed': return 'danger';
        case 'scanning': return 'info';
        case 'processing': return 'warning';
        default: return 'primary';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'completed': return '';
        case 'failed': return '';
        case 'scanning': return '';
        case 'processing': return '';
        case 'pulling': return '';
        default: return '';
      }
    };

    return (
      <div className="d-flex justify-content-center mb-4">
        <Card className="shadow-sm" style={{ maxWidth: '600px', width: '100%' }}>
          <Card.Header className={`bg-${getStatusColor(progress.status)} text-white`}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                {getStatusIcon(progress.status)} Scanning: {imageName}
              </h5>
              <Badge bg="light" text="dark">
                ID: {scanId}
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            {progress.status !== 'failed' ? (
              <>
                <ProgressBar
                  now={progress.progress}
                  label={`${progress.progress}%`}
                  className="mb-3"
                  variant={getStatusColor(progress.status)}
                  animated={progress.status !== 'completed'}
                />
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Status:</strong> {progress.message}
                  </div>
                  {progress.vulnerabilities_found > 0 && (
                    <Badge bg="warning">
                      {progress.vulnerabilities_found} vulnerabilities found
                    </Badge>
                  )}
                </div>
                {progress.status === 'scanning' && (
                  <div className="text-center mt-3">
                    <Spinner animation="border" size="sm" />
                    <small className="text-muted ms-2">
                      This may take a few minutes for large images...
                    </small>
                  </div>
                )}
              </>
            ) : (
              <Alert variant="danger" className="mb-0 text-center">
                <strong>Scan Failed:</strong> {progress.message}
              </Alert>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  };

  // Reusable components
  const ScanSummary = ({ scanData }) => {
    if (!scanData) return null;

    const { severity_counts, total_vulnerabilities, scan_name, image_name } = scanData;
    const displayName = image_name || scan_name;

    return (
      <div className="mb-4">
        <div className="text-center mb-4">
          <Alert variant="info" className="d-inline-block">
            <h4 className="mb-1">🔍 Scan Summary for {displayName}</h4>
            <h3 className="mb-1">{total_vulnerabilities} Total Vulnerabilities</h3>
            {scanData.scan_date && (
              <small className="text-muted">Scanned on: {new Date(scanData.scan_date).toLocaleString()}</small>
            )}
          </Alert>
        </div>

        <Row className="justify-content-center">
          <Col md={8}>
            <Row>
              <Col md={3} sm={6} className="mb-3">
                <Card bg="danger" text="white" className="text-center h-100">
                  <Card.Body className="d-flex flex-column justify-content-center">
                    <h3 className="mb-0">{severity_counts.CRITICAL || 0}</h3>
                    <p className="mb-0">Critical</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3} sm={6} className="mb-3">
                <Card bg="warning" text="white" className="text-center h-100">
                  <Card.Body className="d-flex flex-column justify-content-center">
                    <h3 className="mb-0">{severity_counts.HIGH || 0}</h3>
                    <p className="mb-0">High</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3} sm={6} className="mb-3">
                <Card bg="info" text="white" className="text-center h-100">
                  <Card.Body className="d-flex flex-column justify-content-center">
                    <h3 className="mb-0">{severity_counts.MEDIUM || 0}</h3>
                    <p className="mb-0">Medium</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3} sm={6} className="mb-3">
                <Card bg="secondary" text="white" className="text-center h-100">
                  <Card.Body className="d-flex flex-column justify-content-center">
                    <h3 className="mb-0">{severity_counts.LOW || 0}</h3>
                    <p className="mb-0">Low</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    );
  };

  const getSeverityVariant = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'secondary';
      default: return 'light';
    }
  };

  const VulnerabilityCard = ({ vulnerability }) => {
    return (
      <div className="d-flex justify-content-center mb-3">
        <Card className="shadow-sm" style={{ maxWidth: '800px', width: '100%' }}>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">{vulnerability.id}</span>
            <Badge bg={getSeverityVariant(vulnerability.severity)}>
              {vulnerability.severity}
            </Badge>
          </Card.Header>
          <Card.Body>
            <Card.Title className="text-truncate">{vulnerability.title}</Card.Title>
            <Card.Text>
              <strong>Package:</strong> {vulnerability.package}<br />
              <strong>Installed Version:</strong> {vulnerability.installed_version}<br />
              <strong>Fixed Version:</strong> {vulnerability.fixed_version || 'Not Available'}
            </Card.Text>
          </Card.Body>
        </Card>
      </div>
    );
  };

  // FIXED VULNERABILITY LIST COMPONENT
  const VulnerabilityList = ({ scanData, severityFilter, title, limit = 10 }) => {
    // Debug logging to diagnose the issue
    console.log(`=== ${title} Debug Info ===`);
    console.log('Scan data:', scanData);
    console.log('Severity filter:', severityFilter);
    console.log('Raw vulnerabilities:', scanData?.vulnerabilities);

    if (!scanData?.vulnerabilities) {
      return (
        <div className="text-center">
          <Alert variant="warning" className="d-inline-block">
            <h5>⚠️ No vulnerability data available</h5>
            <p className="mb-0">Unable to load vulnerability details.</p>
          </Alert>
        </div>
      );
    }

    // Filter vulnerabilities by severity
    let filteredVulnerabilities = scanData.vulnerabilities;

    if (severityFilter) {
      filteredVulnerabilities = scanData.vulnerabilities.filter(vuln => {
        const vulnSeverity = vuln.severity || vuln.Severity;
        return vulnSeverity === severityFilter;
      });
    }

    console.log(`Filtered to ${filteredVulnerabilities.length} ${severityFilter || 'all'} vulnerabilities`);
    console.log('Expected count from summary:', scanData.severity_counts?.[severityFilter]);

    // Verify the counts match
    if (severityFilter && scanData.severity_counts) {
      const expectedCount = scanData.severity_counts[severityFilter] || 0;
      const actualCount = filteredVulnerabilities.length;

      if (expectedCount !== actualCount) {
        console.warn(` Count mismatch! Expected: ${expectedCount}, Found: ${actualCount}`);
        console.log('Sample vulnerabilities for debugging:', filteredVulnerabilities.slice(0, 3));
      }
    }

    if (!filteredVulnerabilities || filteredVulnerabilities.length === 0) {
      return (
        <div className="text-center">
          <Alert variant="success" className="d-inline-block">
            <h5> No {title.toLowerCase()} found!</h5>
            <p className="mb-0">This is excellent news for security.</p>
          </Alert>
        </div>
      );
    }

    return (
      <div>
        <div className="text-center mb-4">
          <h4>{title} <Badge bg="secondary">{filteredVulnerabilities.length} found</Badge></h4>
          {severityFilter && scanData.severity_counts && (
            <small className="text-muted">
              Summary shows: {scanData.severity_counts[severityFilter] || 0} |
              Details show: {filteredVulnerabilities.length}
            </small>
          )}
        </div>
        <div className="mb-3">
          {filteredVulnerabilities.slice(0, limit).map((vuln, index) => (
            <VulnerabilityCard key={index} vulnerability={vuln} />
          ))}
        </div>
        {filteredVulnerabilities.length > limit && (
          <div className="text-center">
            <Alert variant="info" className="d-inline-block">
              <strong>... and {filteredVulnerabilities.length - limit} more {title.toLowerCase()}</strong>
              <br />
              <small>Showing top {limit} most critical vulnerabilities</small>
            </Alert>
          </div>
        )}
      </div>
    );
  };

  const ComparisonChart = ({ comparison }) => {
    if (!comparison) return null;

    const { scan1, scan2, improvement } = comparison;
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    return (
      <div>
        <div className="text-center mb-4">
          <Alert variant="success" className="d-inline-block">
            <h3> Security Improvement Analysis</h3>
            <h4> {improvement.total_vulnerabilities_reduced} fewer vulnerabilities ({improvement.improvement_percentage}% improvement)!</h4>
            <p className="mb-0">{improvement.recommendation}</p>
          </Alert>
        </div>

        <Row className="justify-content-center mb-4">
          <Col lg={8}>
            <Row>
              <Col md={6} className="mb-4">
                <Card border="danger" className="h-100">
                  <Card.Header className="bg-danger text-white text-center">
                    <h5 className="mb-0"> Vulnerable Image</h5>
                    <small>{scan1.name}</small>
                  </Card.Header>
                  <Card.Body className="text-center">
                    <h2 className="text-danger mb-3">{scan1.total}</h2>
                    <p className="text-muted">Total Vulnerabilities</p>
                    <hr />
                    {severities.map(severity => (
                      <div key={severity} className="d-flex justify-content-between mb-1">
                        <span>{severity}:</span>
                        <Badge bg={getSeverityVariant(severity)}>
                          {scan1.counts[severity] || 0}
                        </Badge>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} className="mb-4">
                <Card border="success" className="h-100">
                  <Card.Header className="bg-success text-white text-center">
                    <h5 className="mb-0"> Secure Image</h5>
                    <small>{scan2.name}</small>
                  </Card.Header>
                  <Card.Body className="text-center">
                    <h2 className="text-success mb-3">{scan2.total}</h2>
                    <p className="text-muted">Total Vulnerabilities</p>
                    <hr />
                    {severities.map(severity => (
                      <div key={severity} className="d-flex justify-content-between mb-1">
                        <span>{severity}:</span>
                        <Badge bg={getSeverityVariant(severity)}>
                          {scan2.counts[severity] || 0}
                        </Badge>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    );
  };

  // Event handlers for dynamic scanning
  const handleScanStart = (scanId, imageName) => {
    setActiveScan({ scanId, imageName });
  };

  const handleScanComplete = (results) => {
    console.log('=== SCAN COMPLETED ===');
    console.log('Full results:', results);
    console.log('Vulnerabilities array:', results.vulnerabilities);
    console.log('Severity counts:', results.severity_counts);

    setCompletedScans(prev => [results, ...prev.slice(0, 4)]); // Keep last 5 scans
    setActiveScan(null);
  };

  return (
    <div className="min-vh-100 bg-light py-4">
      <Container fluid style={{ maxWidth: '1200px' }}>
        <div className="text-center mb-5">
          <h1 className="display-4 mb-3">🛡️ Container Security Analyzer</h1>
          <p className="lead text-muted mb-2">
            Real-time vulnerability scanning for Docker containers
          </p>
          <p className="text-muted">
            Built with React + Vite + Bootstrap | Dynamic Scanning | Powered by Trivy
          </p>
        </div>

        <div className="d-flex justify-content-center mb-4">
          <div style={{ width: '100%', maxWidth: '900px' }}>
            <Tabs defaultActiveKey="dynamic-scan" className="mb-4" fill variant="pills">
              <Tab eventKey="dynamic-scan" title="🔍 Scan Any Image">
                <DynamicScanner onScanStart={handleScanStart} />

                {activeScan && (
                  <ScanProgress
                    scanId={activeScan.scanId}
                    imageName={activeScan.imageName}
                    onScanComplete={handleScanComplete}
                  />
                )}

                {completedScans.length > 0 && (
                  <div>
                    <div className="text-center mb-4">
                      <h4> Recent Scan Results</h4>
                    </div>
                    {completedScans.map((scan, index) => (
                      <div key={index} className="mb-5">
                        <ScanSummary scanData={scan} />
                        <VulnerabilityList
                          scanData={scan}
                          severityFilter="CRITICAL"
                          title=" Critical Vulnerabilities"
                          limit={5}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Tab>

              <Tab eventKey="vulnerable" title=" Demo: Vulnerable Image">
                {staticLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Loading demo data...</p>
                  </div>
                ) : staticError ? (
                  <div className="text-center">
                    <Alert variant="warning" className="d-inline-block">
                      {staticError}
                      <br />
                      <Button variant="outline-primary" className="mt-2" onClick={loadStaticScanData}>
                        Retry
                      </Button>
                    </Alert>
                  </div>
                ) : nginxScan ? (
                  <div>
                    <ScanSummary scanData={nginxScan} />
                    <VulnerabilityList
                      scanData={nginxScan}
                      severityFilter="CRITICAL"
                      title="🚨 Critical Vulnerabilities"
                      limit={10}
                    />
                  </div>
                ) : null}
              </Tab>

              <Tab eventKey="secure" title="🟢 Demo: Secure Image">
                {staticLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="success" />
                    <p className="mt-3">Loading demo data...</p>
                  </div>
                ) : staticError ? (
                  <div className="text-center">
                    <Alert variant="warning" className="d-inline-block">
                      {staticError}
                    </Alert>
                  </div>
                ) : secureScan ? (
                  <div>
                    <ScanSummary scanData={secureScan} />
                    <VulnerabilityList
                      scanData={secureScan}
                      severityFilter="CRITICAL"
                      title="🚨 Critical Vulnerabilities"
                      limit={10}
                    />
                  </div>
                ) : null}
              </Tab>

              <Tab eventKey="comparison" title="📊 Demo: Security Comparison">
                {staticLoading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="info" />
                    <p className="mt-3">Loading comparison data...</p>
                  </div>
                ) : staticError ? (
                  <div className="text-center">
                    <Alert variant="warning" className="d-inline-block">
                      {staticError}
                    </Alert>
                  </div>
                ) : comparison ? (
                  <ComparisonChart comparison={comparison} />
                ) : null}
              </Tab>
            </Tabs>
          </div>
        </div>

        <footer className="text-center mt-5 py-4 border-top">
          <small className="text-muted">
            Container Security Analyzer built by @github sahiee-dev
          </small>
        </footer>
      </Container>
    </div>
  );
}

export default App;
