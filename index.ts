import express, { Application, Request, Response } from "express";
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { resolve } from 'path';
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function getFilesRec(dir: string): Promise<any> {
    const subdirs = await readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getFilesRec(res) : res;
    }));
    return files.reduce((a, f) => a.concat(f), []);
  }

const app: Application = express();
const port = 3000;

// Body parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get(
    "/",
    async (req: Request, res: Response): Promise<Response> => {
        try {
            let folderNames = await fs.readdirSync(path.resolve('.', 'Projects'));
            let projects = folderNames.filter(x =>
                !x.startsWith('.')
            )
            return res.status(200).send({
                projects: projects
            });
        } catch (_) {
            return res.status(500).send({
                message: 'An error ocurred'
            });
        }
    }
);

app.get(
    "/course/:name",
    async (req: Request, res: Response): Promise<Response | void> => {
        try {
            let fullPath = decodeURI(path.resolve(path.join('.', 'Projects', req.params.name, 'guides.json')));
            if (!fs.existsSync(fullPath)) {
                return res.status(404).send({
                    path: fullPath,
                    name: req.params.name,
                    message: 'The course does not exist'
                });
            }
            const contents = JSON.parse(fs.readFileSync(fullPath).toString());
            return res.status(200)
                .json(contents);
        } catch (_) {
            return res.status(500).send({
                message: 'An error ocurred'
            });
        }
    }
);

app.get(
    "/course/:name/assets",
    async (req: Request, res: Response): Promise<Response | void> => {
        try {
            let fullPath = decodeURI(path.resolve(path.join('.', 'Projects', req.params.name, 'assets')));
            if (!fs.existsSync(fullPath)) {
                return res.status(200).send([]);
            }
            const files: string[] = await getFilesRec(fullPath);
            const paths = files.map(e => path.relative(path.join('.', 'Projects', req.params.name), e))
            return res.status(200)
                .json(paths);
        } catch (_) {
            return res.status(500).send({
                message: 'An error ocurred'
            });
        }
    }
);

app.get(
    "/*",
    async (req: Request, res: Response): Promise<Response | void> => {
        try {
            let fullPath = decodeURI(path.resolve(path.join('.', 'Projects', req.path)))
            console.log(fullPath);
            if (!fs.existsSync(fullPath)) {
                return res.status(404).send({
                    path: req.path,
                    message: 'Folder of file does not exist'
                });
            }
            if (fs.lstatSync(fullPath).isDirectory()) {
                let itemNames = await fs.readdirSync(fullPath);
                let items = itemNames.filter(x =>
                    !x.startsWith('.')
                ).map(x => {
                    console.log(x);
                    let pathNoProjectName = req.path.substring(req.path.indexOf('/')+1);
                    pathNoProjectName = pathNoProjectName.substring(pathNoProjectName.indexOf('/')+1);
                    if (fs.lstatSync(path.join(fullPath, x)).isDirectory()) {
                        return {
                            dir: true,
                            name: x,
                            path: req.path,
                            relativePath: `${pathNoProjectName}/${x}`
                        }
                    } else {
                        return {
                            dir: false,
                            name: x,
                            relativePath: `${pathNoProjectName}/${x}`
                        }
                    }
                })
                return res.status(200).send({
                    items: items,
                });
            }
            return res.sendFile(fullPath);
        } catch (_) {
            return res.status(500).send({
                message: 'An error ocurred'
            });
        }
    }
);

try {
    app.listen(port, (): void => {
        console.log(`Connected successfully on port ${port}`);
    });
} catch (error: any) {
    console.error(`Error occured: ${error.message}`);
}