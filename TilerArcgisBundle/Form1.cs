using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace TilerArcgisBundle
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            ArcgisBundleHelper Helper = new ArcgisBundleHelper(@"F:\HHY公司\工作研究\arcgis紧凑型切片读取\tiler-arcgis-bundle-master\test\sample");

            //for (int x = 192; x < 210; x++)
            //{
            //    for (int y = 80; y < 100; y++)
            //    {
            //        Helper.GetTile(x, y, 8);
            //    }
            //}
            Helper.GetTile(1670, 776, 11);
            //全球只能到85，南北纬转web墨卡托会失真
           //ConvertTile(85, 180,9);
          //  ConvertTile(-85, -180,9);
        }
        /// <summary>
        /// 通过经纬度获取切片位置
        /// </summary>
        /// <param name="lat_deg">纬度</param>
        /// <param name="lon_deg">经度</param>
        /// <param name="zoom">切片等级</param>
        private void ConvertTile(double lat_deg, double lon_deg, int zoom)
        {
            double lat_rad = (Math.PI / 180) * lat_deg;
            double n = Math.Pow(2, zoom);
            double xtile = Math.Floor((lon_deg + 180.0) / 360.0 * n);
            double ytile = Math.Floor((1.0 - Math.Log(Math.Tan(lat_rad) + (1 / Math.Cos(lat_rad))) / Math.PI) / 2.0 * n);
        }
    }
}
