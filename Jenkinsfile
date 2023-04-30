pipeline {
    agent {
        label 'ubuntu_agent'
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
                withCredentials([string(credentialsId: 'my_env_file', variable: 'ENV_CONTENTS')]) {
                    writeFile file: '.env', text: "${ENV_CONTENTS}"
                }
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
