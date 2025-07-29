import React, { useState, useEffect } from 'react';
import { Card, ProgressBar, Alert, Spinner, Badge } from 'react-bootstrap';

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
                    // Get full results
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
            case 'completed': return '✅';
            case 'failed': return '❌';
            case 'scanning': return '🔍';
            case 'processing': return '⚙️';
            case 'pulling': return '📥';
            default: return '🔄';
        }
    };

    return (
        <Card className="mb-4 shadow-sm">
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
                    <Alert variant="danger" className="mb-0">
                        <strong>Scan Failed:</strong> {progress.message}
                    </Alert>
                )}
            </Card.Body>
        </Card>
    );
};

export default ScanProgress;
