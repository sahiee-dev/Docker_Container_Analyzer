import React from 'react';
import { Row, Col, Card, Alert } from 'react-bootstrap';

const ScanSummary = ({ scanData }) => {
    const { severity_counts, total_vulnerabilities } = scanData;

    return (
        <div className="mb-4">
            <Alert variant="info" className="text-center">
                <h4>🔍 Scan Summary: {total_vulnerabilities} Total Vulnerabilities</h4>
            </Alert>

            <Row>
                <Col md={3}>
                    <Card bg="danger" text="white" className="text-center">
                        <Card.Body>
                            <h3>{severity_counts.CRITICAL || 0}</h3>
                            <p>Critical</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card bg="warning" text="white" className="text-center">
                        <Card.Body>
                            <h3>{severity_counts.HIGH || 0}</h3>
                            <p>High</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card bg="info" text="white" className="text-center">
                        <Card.Body>
                            <h3>{severity_counts.MEDIUM || 0}</h3>
                            <p>Medium</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card bg="secondary" text="white" className="text-center">
                        <Card.Body>
                            <h3>{severity_counts.LOW || 0}</h3>
                            <p>Low</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ScanSummary;
