const uuid4 = require('uuid/v4');

import React, { Component } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

import {
    addContentrc,
} from '../actions/index';

import {
    SPEC_DEFAULTS,
} from "../constants/spec-defaults";

import {
    request,
    getPath,
    save,
    getContent,
} from "../github";

import WideRow from "./partials/WideRow";

const mapStateToProps = state => {
  const {
    personal_access_token,
    selected_branch, 
    contentrc,
 } = state.genericReducer;

  return {
    personal_access_token,
    selected_branch, 
    contentrc,
  }
};

const mapDispatchToProps = dispatch => {
    return {
        addContentrc: content => dispatch(addContentrc(content)),
    };
};

const getIndex = () => `
<!doctype html>
<html>
    <head>
        <title>Tests</title>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">
        <link href="https://cdn.rawgit.com/mochajs/mocha/2.2.5/mocha.css" rel="stylesheet" />
    </head>
    <body id="main-theme-override" class="js-tests-runner">
        <div id="mocha"></div>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/chai/4.1.2/chai.min.js"></script>
        <script src="https://cdn.rawgit.com/mochajs/mocha/2.2.5/mocha.js"></script>
        <script>
            mocha.setup('bdd')
        </script>
        <script src="js/prompt.js"></script>
        <script src="js/tests.js"></script>
        <script>
            mocha.run();
        </script>
    </body>
</html>`;

class ConnectedDashboard extends Component {

    constructor() {
        super()

        this.state = {
            selectedTag: null,
            tags: {},
            all: [],
            selectedItems: {},

            loading: false,
            setRepoView: false,
            repoName: '',
            repo: null,
        }

        this.selectItem = this.selectItem.bind(this)
        this.showRepoView = this.showRepoView.bind(this)
        this.updateRepoName = this.updateRepoName.bind(this)

        this.buildRepo = this.buildRepo.bind(this)
        this.close = this.close.bind(this)
    }

    close(e) {
        this.setState({loading: false, selectedItems: {}, repo: null, repoName: '', setRepoView: false, })
    }

    updateRepoName(e) {
        this.setState({
            repoName: e.target.value,
        })
    }

    showRepoView(e) {
        this.setState({
            setRepoView: true,
            loading: true,
        })
    }

    buildRepo(e) {
        this.setState({loading: true, setRepoView: false,})

        const repoName = this.state.repoName || "PSET-"+(Date.now())
        if (!this.state.repoName) {
            alert('repoName empty, defaulting to: ' + repoName);
        }
        const {user, selectedItems} = this.state;

        const timeout = (timeout=1000) => new Promise(resolve => {
            setTimeout(() => resolve(), timeout)
        });

        const makeRepo = request(
            "/user/repos",
            "POST",
            {},
            {},
            {
                "name": repoName, 
                "license_template": "mit",
            }
        )
        .then(() => timeout())
        .then(() => Object.keys(selectedItems)
            .map(uuid => getContent(uuid, [], 'master')))


        const contentToCommit = makeRepo
            .then(content => Promise.all(content)
                .then(all => {
                    console.log(all)
                    return all;
                }));

        const commitSha = contentToCommit.then(all => request(getPath("repos", "git/refs/heads/master", user, repoName), "GET"))
            .then(({data}) => contentToCommit.then(all => ({
                sha: data.object.sha,
                all,
            })))

        const shaBaseTree = commitSha.then(({sha, all}) => request(getPath("repos", "git/commits/" + sha, user, repoName), "GET"))
            .then(({data}) => contentToCommit.then(all => ({
                sha: data.sha,
                all,
            })))

        const shaNewTree = shaBaseTree.then(({sha, all}) => request(
            getPath(
                "repos",
                "git/trees",
                user,
                repoName,
            ),
            "POST",
            {},
            {},
            {
                base_tree: sha,
                tree: all.reduce((arr, curr, i) => {
                    if (arr.length === 0) {
                        arr = arr.concat([{
                            mode: '100644',
                            type: 'blob',
                            path: 'README.md',
                            content: `# [${repoName}](https://${user}.github.io/${repoName})
Each link below will take you to an individual practice problem set. Within each pset, you will find the HTML/code necessary to run the tests and view how well your code is working.

## Problems
                            `,
                        }, {
                            mode: '100644',
                            type: 'blob',
                            path: 'index.html',
                            content: `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>${repoName}</title>

        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" integrity="sha384-WskhaSGFgHYWDcbwN70/dfYBj47jz9qbsMId/iRN3ewGhXQFZCSftd1LZCfmhktB" crossorigin="anonymous">
        <link href="https://stackpath.bootstrapcdn.com/bootswatch/4.1.1/lux/bootstrap.min.css" rel="stylesheet">
    </head>

    <body>
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <a class="navbar-brand" href="#">PSET</a>
        </nav>
        <br>
        <br>
        <div id="app" class="container"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/0.4.0/marked.min.js"></script>
        <script>
            const xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://raw.githubusercontent.com/${user}/${repoName}/master/README.md')
            xhr.onload = e => document.querySelector('#app').innerHTML = marked(xhr.responseText)
            xhr.send()
        </script>
    </body>
</html>
                            `
                        }]);
                    }

                    const hash = curr.reduce((hash, each) => Object.assign({}, hash, {
                        [each.name]: each,
                    }), {})

                    const metaContent = JSON.parse(hash["meta.json"].content);
                    const title = metaContent.title.replace(/\s/g, "_");
                    arr[0].content += `
* **[${title}](${title})**`
                    return arr.concat([{
                        mode: '100644',
                        type: 'blob',
                        path: title + '/index.html',
                        content: getIndex(),
                    }, {
                        mode: '100644',
                        type: 'blob',
                        path: title + '/README.md',
                        content: hash["background.md"].content,
                    }, {
                        mode: '100644',
                        type: 'blob',
                        path: title + '/js/' + hash["prompt.js"].name,
                        content: hash["prompt.js"].content,
                    }, {
                        mode: '100644',
                        type: 'blob',
                        path: title + '/js/' + hash["tests.js"].name,
                        content: hash["tests.js"].content,
                    }]);
                }, []),
            }
        )).then(({data}) => data.sha);

        const shaNewCommit = Promise.all([commitSha, shaNewTree])
            .then(([{sha,}, shaNewTree]) => {
                return request(
                    getPath("repos", "git/commits", user, repoName),
                    "POST",
                    {},
                    {},
                    {
                        parents: [sha],
                        tree: shaNewTree,
                        message: 'creating pset',
                    }
                );
            })
            .then(({data}) => data.sha);
        
        const finalStep = shaNewCommit.then(sha => request(
            getPath("repos", "git/refs/heads/master", user, repoName),
            "POST",
            {},
            {},
            {sha,}
        )).then(({data}) => console.log(data))
          /*
          .then(() => request(
            getPath("repos", "pages", user, repoName),
            "PUT",
            {},
            {
                "Accept": "application/vnd.github.mister-fantastic-preview+json"
            },
            {
                "source": "master",
            }
          ))
          */
          .then(() => {
            this.setState({repo: `https://github.com/${user}/${repoName}`,})
            //alert(`Repo created: https://github.com/${user}/${repoName}`)
          })
    }

    selectItem(e) {
        const uuid = e.target.getAttribute('data-uuid')

        if (this.state.selectedItems[uuid]) {
            // LOL don't hate me for this, clever af trick
            // for removing key from an object without actually
            // mutating that object...#teamFunctionCode
            const {[uuid]: omit, ...res} = this.state.selectedItems;
            this.setState({
                selectedItems: res,
            });

            return;
        }


        this.setState({
            selectedItems: Object.assign({}, this.state.selectedItems, {
                [uuid]: true,
            }),
        });
    }

    componentDidMount() {
        const {
            selected_branch,
            personal_access_token,
            history,
        } = this.props;

        if (!personal_access_token) {
            history.push("/");
        }

        if (!selected_branch) {
            history.push("/dashboard");
        }


        const getMe = request("/user", "GET")
            .then(({data}) => {
                this.setState({
                    user: data.login,
                });
            })
            .catch(e => {
                alert('could not find user! login again')
            });
        // get contentrc for tags parsing
        request(
            getPath("repos", "contents/content/.contentrc"),
            "GET",
            {ref: selected_branch}
        ).then(({data}) => {
            const {content} = data;

            const tformedContent = JSON.parse(atob(content));

            this.props.addContentrc(tformedContent);
        });

        // get all content
        request(
            getPath("repos", "contents/"),
            "GET",
            {ref: selected_branch,}
        ).then(({data}) => {
            const contentDir = data.filter(item => item.name === "content");
            if (contentDir.length === 0) return;
            const contentSha = contentDir[0].sha;

            return request(
                getPath("repos", "git/trees/"+contentSha),
                "GET",
                {recursive: 1},
            );
        }).then(({data}) => data.tree.filter(item => item.path.indexOf("meta.json") > -1))
          .then(data => Promise.all(data.map(item => request(
            getPath("repos", "contents/content/"+item.path),
            "GET",
            {ref: selected_branch}
          ).then(({data}) => {
            const {content} = data;
            const tformedContent = JSON.parse(atob(content));
            return {tformedContent, data, uuid: item.path.split('/')[0]};
          }))))
          .then(all => {
            console.log(all)
            this.setState({all,})
          })
    }

    getContentItems(e, tag, data) {
        e.preventDefault();
        const {
            selected_branch,
        } = this.props;

        this.setState({selectedTag: tag});
        if (this.state.tags[tag]) return;

        const dataContent = data.map(item => {
            return request(
                getPath("repos", "contents/content/" + item + "/meta.json"),
                "GET",
                {ref: selected_branch}
            ).then(({data}) => {
                const {content} = data;
                const tformedContent = JSON.parse(atob(content));
                return {tformedContent, data, uuid: item};
            });
        });

        Promise.all(dataContent).then(([...all]) => {
            this.setState({
                tags: Object.assign({}, this.state.tags, {
                    [tag]: all
                }),
            });
        });
    }

    render() {
        return (<WideRow>
            {this.renderBuild()}
            <br />
            <br />
            {this.renderTags()}
            <br />
            <br />
            {this.renderTagList()}
            <br />
            <br />
            {this.renderAll()}
            {this.renderModal()}
        </WideRow>);
    }

    renderModal() {
        if (!this.state.loading) return null;
        const styles = {
            'position': 'fixed',
            'top': '0',
            'left': '0',
            'width': '100%',
            'height': '100%',
            'backgroundColor': 'rgba(0,0,0,0.5)',
            'zIndex': '9',
            'display': 'flex',
            'justifyContent': 'center',
            'alignItems': 'center',
        }

        let content;
        if (this.state.repo) {
            content = (<strong style={{'textAlign': 'center'}}>
                <a className="btn btn-success" href={this.state.repo} target="_blank">Click here to open your PSET</a>
                <br/>
                <a className="btn btn-success" href={this.state.repo+"/settings"} target="_blank">
                    Click here to configure Github Pages (API limitation)
                </a>
                <br/>
                <button className="btn btn-primary" onClick={this.close}>Go Back to Dashboard</button>
            </strong>)
        }
        else if (this.state.setRepoView) {
            content = <strong style={{'textAlign': 'center'}}>
                <div className="form-group">
                    <label htmlFor="repo-name">Repo Name</label>
                    <input type="text"
                           onChange={this.updateRepoName}
                           className="form-control"
                           id="repo-name"
                           placeholder="Enter Github Repo Name" />
                    <small className="form-text text-muted">Raybans will create this repo and pull chosen PSETs into it</small>
                </div>
                <br/>
                <button className="btn btn-success" onClick={this.buildRepo}>Create PSET</button> {" "}
                <button className="btn btn-primary" onClick={this.close}>Go Back to Dashboard</button>
            </strong>
        }
        else {
            content = <div id="loading"></div>;
        }

        return (<div style={styles}>
            {content} 
        </div>)
    }

    renderBuild() {
        const numKeys = Object.keys(this.state.selectedItems).length
        if (!numKeys) {
            return null;
        }

        const styles = {
            'position': 'fixed',
            'bottom': '10px',
            'right': '10px',
            'cursor': 'pointer',
            'zIndex': '9',
        };

        return (<button
            onClick={this.showRepoView}
            style={styles}
            className="btn btn-lg btn btn-success">Create PSET ({numKeys})</button>)
    }

    renderTags() {
        const {contentrc} = this.props;
        const {selectedTag} = this.state;
        if (!contentrc) {
            return null;
       }

        if (contentrc.tagsDict.length === 0) {
            return (<div>No tags found</div>);
        }

        const tags = Object.keys(contentrc.tagsDict).map((tag, i) => {
            const data = contentrc.tagsDict[tag];
            const btnType = tag === selectedTag ? "btn-success" : "btn-info";
            return (<div className="btn-group"
                onClick={e => this.getContentItems(e, tag, data)}
                key={i}
                style={{margin: "10px"}}>
                <button className={"btn btn-sm active " + btnType}>{tag}</button>
                <button className={"btn btn-sm " + btnType}>{data.length}</button>
            </div>);
        });

        return (<div>
            <h2>Tags</h2>
            {tags}
        </div>)
    }

    _renderList(items) {
        console.log(this.state.selectedItems)
        return items.map((item, i) => {
            const {tformedContent, data, uuid} = item;
            const btnType = this.state.selectedItems[uuid] ? 'btn-success' : 'btn-info';
            return (<div className="card text-white mb-12" key={i}>
                <div className="card-header">
                    <Link to={"/workspace/"+uuid}>{tformedContent.title}</Link>
                    <button 
                        onClick={this.selectItem}
                        data-uuid={uuid}
                        className={"btn btn-sm active " + btnType}
                        style={{"float": "right"}}>Select</button>
                </div>
                <div className="card-body">
                    <div className="card-text">
                        <strong>UUID: </strong> {uuid}
                    </div>
                    <div className="card-text">
                        <strong>TAGS: </strong> {(tformedContent.tags || []).map((tag, j) => {
                            return <span
                                key={j}>{tag + (j === tformedContent.tags.length - 1 ? "" : ", ")}</span>
                        })}
                    </div>
                </div>
            </div>)
        });
    }

    renderTagList() {
        const {selectedTag, tags} = this.state;
        if (!selectedTag || !tags[selectedTag]) return null;

        return this._renderList(tags[selectedTag]);
    }

    renderAll() {
        if (this.state.all.length === 0) return null;

        return (<div>
            <h2>All Problems</h2>
            {this._renderList(this.state.all)}
        </div>);
    }
}

const Dashboard = connect(mapStateToProps, mapDispatchToProps)(ConnectedDashboard);
export default Dashboard;
