pipeline {
    agent {
        label 'ubuntu_agent'
    }
    environment {
        PATH = "/home/ubuntu/.nvm/versions/node/v18.14.2/bin:${env.PATH}"
    }
    stages {
        stage('Set up nvm and select node/npm version') {
            steps {
                sh '''
                    export NVM_DIR="$HOME/.nvm"
                    if [ ! -d "$NVM_DIR" ]; then
                        git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR"
                        cd "$NVM_DIR"
                        git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" origin`
                    fi

                    . "$NVM_DIR/nvm.sh"
                    nvm install 18.14.2
                    nvm use 18.14.2
                    nvm install-latest-npm
                '''
            }
        }
        stage('Install dependencies') {
            steps {
                sh 'npm install'
                sh 'npm install -g pm2'
            }
        }
        stage('Prepare .env file') {
            steps {
                withCredentials([file(credentialsId: 'my_env_file', variable: 'ENV_FILE')]) {
                    sh 'cp $ENV_FILE .env'
                }
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
