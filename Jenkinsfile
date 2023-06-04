pipeline {
    agent {
        label 'ubuntu_agent'
    }
    environment {
        PATH = "/home/ubuntu/.nvm/versions/node/v18.14.2/bin:${env.PATH}"
    }
    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm install'
            }
        }
        stage('Compress and remove log files') {
            steps {
                sh '''
                    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                    LOG_DIR="/home/ubuntu/.pm2/logs"
                    ARCHIVE_DIR="/home/ubuntu/logs_archive"

                    if [ ! -d "$ARCHIVE_DIR" ]; then
                        mkdir -p "$ARCHIVE_DIR"
                    fi

                    cd "$LOG_DIR"
                    for log_file in *.log; do
                        if [ -f "$log_file" ]; then
                            gzip -c "$log_file" > "${ARCHIVE_DIR}/${log_file}_${TIMESTAMP}.gz"
                            rm "$log_file"
                        fi
                    done
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh 'pm2 stop lovestory || true'
                sh 'pm2 start app.js --name lovestory'
            }
        }
    }
}
