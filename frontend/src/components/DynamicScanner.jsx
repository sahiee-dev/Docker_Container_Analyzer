/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { Card, Form, Button, Badge, Alert, Spinner } from 'react-bootstrap';

const DynamicScanner = ({ onScanStart }) => {
    const [imageName, setImageName] = useState('');
    const [scanning, setScanning] = useState(false);
    const [popularImages, setPopularImages] = useState([]);
    const [error, setError] = useState(null);

    React.useEffect(() => {
        loadPopularImages();
    }, []);

    const loadPopularImages = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/popular-images');
            const images = await response.json();
            setPopularImages(images);
        } catch (err) {
            console.error('Failed to load popular images:', err);
        }
    };

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
                setImageName(''); // Clear input after successful start
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
        <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-primary text-white">
                <h4 className="mb-0">🐳 Dynamic Container Security Scanner</h4>
            </Card.Header>
            <Card.Body>
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Form.Group className="mb-3">
                    <Form.Label>
                        <strong>Docker Image Name:</strong>
                        <small className="text-muted ms-2">
                            Enter any public Docker image (e.g., nginx:latest, python:3.11)
                        </small>
                    </Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="e.g., nginx:latest, python:3.11, your-app:v1.0"
                        value={imageName}
                        onChange={(e) => setImageName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={scanning}
                        size="lg"
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

                <div>
                    <h6 className="text-muted mb-2">💡 Popular Images to Try:</h6>
                    <div className="d-flex flex-wrap gap-2">
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
            </Card.Body>
        </Card>
    );
};

export default DynamicScanner;
