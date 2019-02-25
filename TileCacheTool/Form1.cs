using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace TileCacheTool
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            // Action<int> a1 = delegate (int i) { Console.WriteLine(i); };
            Type type = Type.GetType("TileCacheTool.BundleModel");
           var xx=  type.GetConstructors();
            InitializeComponent();
        }
        [DisplayName("")]
        private void button1_Click(object sender, EventArgs e)
        {
            //左上
            double llon = Convert.ToDouble(textBox6.Text.Split(',')[0]);
            double llat = Convert.ToDouble(textBox6.Text.Split(',')[1]);
            //右下
            double rlon = Convert.ToDouble(textBox5.Text.Split(',')[0]);
            double rlat = Convert.ToDouble(textBox5.Text.Split(',')[1]);

            //切片等级
            string[] gradestrs = textBox4.Text.Split('-');

            int levelmin = Convert.ToInt32(gradestrs[0]);
            int levelmax = Convert.ToInt32(gradestrs[1]);
            //需开启的线程数
            int threadcount = Convert.ToInt32(textBox3.Text);
            List<BundleModel> bundleModelList = new List<BundleModel>();
            for (int i = levelmin; i < levelmax + 1; i++)
            {
                //切片等级
                int level = i;
                //获取所有文件对象类。
                double[] xy = ConvertTile(llat, llon, level);
                double[] xy1 = ConvertTile(rlat, rlon, level);
                int[] xyparm = new int[4] { Convert.ToInt32(xy[1]), Convert.ToInt32(xy1[1]), Convert.ToInt32(xy[0]), Convert.ToInt32(xy1[0]) };
                bundleModelList.AddRange(GetLevelBundle(level, xyparm));
            }
            //将文件平均分给各个线程
            int count = bundleModelList.Count() / threadcount;
            int yu = bundleModelList.Count() % threadcount;
            if (count == 0)
            {
                for (int i = 0; i < bundleModelList.Count; i++)
                {
                    List<BundleModel> model = bundleModelList.Skip(i).Take(1).ToList();
                    System.Threading.ThreadPool.QueueUserWorkItem((state) =>
                    {
                        foreach (var item in model)
                        {
                            ToImg(item);
                        }
                        this.BeginInvoke(new Action(() =>
                        {

                        }));
                    }, model);
                }
            }
            else
            {
                for (int i = 0; i < threadcount; i++)
                {
                    List<BundleModel> model = bundleModelList.Skip(i * count).Take(count).ToList();
                    if (i < yu)
                    {
                        model.AddRange(bundleModelList.Skip(threadcount * count + i).Take(1).ToList());
                    }
                    System.Threading.ThreadPool.QueueUserWorkItem((state) =>
                    {
                        foreach (var item in model)
                        {
                            ToImg(item);
                        }
                        this.BeginInvoke(new Action(() =>
                        {

                        }));
                    }, model);
                }
            }
        }
        /// <summary>
        /// 获取某一切片等级下的文件对象
        /// </summary>
        /// <param name="level"></param>
        /// <param name="xy">【x1,y1,x2,y2】</param>
        /// <returns></returns>
        private List<BundleModel> GetLevelBundle(int level, int[] xy)
        {
            List<BundleModel> bundleModelList = new List<BundleModel>();
            int minx = ((xy[0] + 1) / 128) * 128;
            int maxx = ((xy[1] + 1) / 128) * 128;
            int miny = ((xy[2] + 1) / 128) * 128;
            int maxy = ((xy[3] + 1) / 128) * 128;
            int xcount = (maxx - minx) / 128 + 1;
            int ycount = (maxy - miny) / 128 + 1;
            for (int x = 0; x < xcount; x++)
            {
                for (int y = 0; y < ycount; y++)
                {
                    BundleModel bm = new BundleModel();
                    bm.StartX = minx + (x) * 128;
                    bm.StartY = miny + (y) * 128;
                    var rGroup = Convert.ToInt32(128 * Convert.ToInt32(bm.StartX / 128));
                    var cGroup = Convert.ToInt32(128 * Convert.ToInt32(bm.StartY / 128));
                    var bundleBase = getBundlePath(textBox1.Text, level, rGroup, cGroup);
                    bm.Level = level;
                    bm.BundlxDire = bundleBase + ".bundlx";
                    bm.BundleDire = bundleBase + ".bundle";
                    bm.BundleName = Path.GetFileNameWithoutExtension(bm.BundleDire);
                    bundleModelList.Add(bm);
                }
            }
            return bundleModelList;
        }
        /// <summary>
        /// 通过经纬度获取切片位置
        /// </summary>
        /// <param name="lat_deg">纬度</param>
        /// <param name="lon_deg">经度</param>
        /// <param name="zoom">切片等级</param>
        private double[] ConvertTile(double lat_deg, double lon_deg, int zoom)
        {
            double lat_rad = (Math.PI / 180) * lat_deg;
            double n = Math.Pow(2, zoom);
            double xtile = Math.Floor((lon_deg + 180.0) / 360.0 * n);
            double ytile = Math.Floor((1.0 - Math.Log(Math.Tan(lat_rad) + (1 / Math.Cos(lat_rad))) / Math.PI) / 2.0 * n);
            return new double[2] { xtile, ytile };
        }


        /// <summary>
        /// 查找切片对应的文件路径
        /// </summary>
        /// <param name="root">路径</param>
        /// <param name="level">切片等级</param>
        /// <param name="rGroup"></param>
        /// <param name="cGroup"></param>
        /// <returns></returns>
        private string getBundlePath(string root, int level, int rGroup, int cGroup)
        {
            var bundlesDir = root;
            var l = level.ToString();
            var lLength = l.Length;
            if (lLength < 2)
            {
                for (var i = 0; i < 2 - lLength; i++)
                {
                    l = "0" + l;
                }
            }
            l = "L" + l;

            var r = rGroup.ToString("X");
            var rLength = r.Length;
            if (rLength < 4)
            {
                for (var i = 0; i < 4 - rLength; i++)
                {
                    r = "0" + r;
                }
            }
            r = "R" + r;

            var c = cGroup.ToString("X");
            var cLength = c.Length;
            if (cLength < 4)
            {
                for (var i = 0; i < 4 - cLength; i++)
                {
                    c = "0" + c;
                }
            }
            c = "C" + c;
            var bundlePath = string.Format(@"{0}\{1}\{2}{3}", bundlesDir,
                l, r, c);
            return bundlePath;
        }
        /// <summary>
        /// 打开切片文件并保存切片
        /// </summary>
        /// <param name="bm"></param>
        private void ToImg(BundleModel bm)
        {
            byte[] BundlxData = null;
            byte[] BundleData = null;
            using (FileStream file = new FileStream(bm.BundlxDire, FileMode.Open))
            {
                byte[] bufferfile = new byte[file.Length];
                file.Read(bufferfile, 0, (int)file.Length);
                //写入数据
                BundlxData = bufferfile;
            }
            using (FileStream file = new FileStream(bm.BundleDire, FileMode.Open))
            {
                byte[] bufferfile = new byte[file.Length];
                file.Read(bufferfile, 0, (int)file.Length);
                //写入数据
                BundleData = bufferfile;
            }
            for (int x = 0; x < 128; x++)
            {
                for (int y = 0; y < 128; y++)
                {
                    int index = 128 * x + y;
                    GetTile(bm.StartX + x, bm.StartY + y, bm.Level, index, BundlxData, BundleData);
                }
            }
        }
        /// <summary>
        /// 获取切片方法
        /// </summary>
        /// <param name="x"></param>
        /// <param name="y"></param>
        /// <param name="z"></param>
        /// <param name="index"></param>
        /// <param name="bundlxData"></param>
        /// <param name="bundleData"></param>
        public void GetTile(int x, int y, int z, int index, byte[] bundlxData, byte[] bundleData)
        {
            byte[] buffer = new byte[5];
            byte[] bufferfile = bundlxData;
            buffer = bufferfile.Skip(16 + 5 * index).Take(4).ToArray();
            //偏移量
            var offset = BitConverter.ToInt32(buffer, 0);
            readTile(x, y, z, offset, bundleData);
        }
        //读取切片并写入
        private void readTile(int x, int y, int z, int offset, byte[] bundleData)
        {
            byte[] buffer = new byte[4];
            byte[] bufferfile = bundleData;
            //获取bundle具体切片文件字节数
            buffer = bufferfile.Skip(offset).Take(4).ToArray();
            var length = BitConverter.ToInt32(buffer, 0);
            byte[] tileData = new byte[length];
            //根据索引和字节数读出文件位置
            tileData = bufferfile.Skip(offset + 4).Take(length).ToArray();
            string L="L"+ zeroPad(z, 2);
            string R = "R" + zeroPad(x, 8,1);
            string C = "C" + zeroPad(y-1, 8,1);
            string path = textBox2.Text+"\\"+L+"\\"+R;
            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
            }
            if (tileData.Length > 0)
            {
                using (FileStream stream = new FileStream(path+"\\"+C + ".png", FileMode.OpenOrCreate))
                {
                    stream.Write(tileData, 0, tileData.Length);
                }
            }
        }
        private string zeroPad(int num, int len,int type=0)
        {
            string str = num.ToString(); 
            if (type==1)
            {
                 str = num.ToString("X");
            }
            while (str.Length < len)
            {
                str = "0" + str;
            }
            return str;
        }
    }
    public class BundleModel
    {
        public int Level { get; set; }
        public string BundleName { get; set; }
        public string BundleDire { get; set; }
        public string BundlxDire { get; set; }
        //切片编号
        public int StartX { get; set; }
        public int StartY { get; set; }
    }
}
